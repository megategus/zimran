import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getGuestId } from '@/lib/guest';
import { fromRow, type CarRow } from '@/lib/vehicle/cars';
import { getRecalls } from '@/lib/vehicle/recalls';
import { QuoteParseError, parseQuote } from '@/lib/quote/parse';
import { NoLinesError, checkQuote } from '@/lib/quote/check';
import { duePlan } from '@/lib/schedule/plan';
import { fromRecordRow, type RecordRow } from '@/lib/records/rows';
import sampleQuotes from '@/db/seed/sample_quotes.json';
import type { Plan, QuoteVerdict } from '@/lib/types';

export const maxDuration = 60; // photo parsing can take a while

const Body = z.object({
  carId: z.string().uuid(),
  text: z.string().max(20_000).optional(),
  imageBase64: z.string().max(7_000_000).optional(), // ~5 MB image
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).optional(),
  sampleId: z.string().max(20).optional(),
}).refine((b) => b.text?.trim() || b.imageBase64 || b.sampleId, { message: 'Send text, a photo or a sampleId' });

const FREE_UNLOCKED_LINES = 2;

/** Free plan sees the headline and the first lines; script and later ranges are Plus. */
function forPlan(v: QuoteVerdict, plan: Plan) {
  if (plan === 'plus') return { ...v, locked: false };
  return {
    ...v,
    locked: true,
    lines: v.lines.map((l, i) => {
      const c = { ...l };
      delete c.sayToShop;
      if (i >= FREE_UNLOCKED_LINES) { delete c.fairLowCents; delete c.fairHighCents; }
      return c;
    }),
  };
}

// POST /api/quotes/check → { checkId, verdict, plan }
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const { carId, text, imageBase64, mediaType, sampleId } = parsed.data;
  const guestId = getGuestId(req);

  const { data: carRow } = await db().from('cars').select('*').eq('id', carId).eq('guest_id', guestId).maybeSingle<CarRow>();
  if (!carRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const car = fromRow(carRow);

  const sample = sampleId ? (sampleQuotes as { id: string; text: string }[]).find((q) => q.id === sampleId) : undefined;
  if (sampleId && !sample) return NextResponse.json({ error: 'unknown_sample' }, { status: 400 });
  const input = sample ? { text: sample.text } : { text, imageBase64, mediaType };

  const [lines, recalls, records, ent] = await Promise.all([
    // Unreadable input becomes "no lines"; API outages still surface as 500s.
    parseQuote(input).catch((e) => { if (e instanceof QuoteParseError) return []; throw e; }),
    getRecalls(car),
    db().from('service_records').select('*').eq('asset_id', carId).eq('guest_id', guestId),
    db().from('entitlements').select('plan').eq('guest_id', guestId).maybeSingle<{ plan: Plan }>(),
  ]);
  const history = ((records.data ?? []) as RecordRow[]).map(fromRecordRow);
  const today = new Date();

  let verdict: QuoteVerdict;
  try {
    verdict = checkQuote(lines, { car, history, recalls: 'items' in recalls ? recalls.items : [], today });
  } catch (e) {
    if (e instanceof NoLinesError) return NextResponse.json({ error: 'no_lines', message: e.message }, { status: 422 });
    throw e;
  }

  const { data: saved, error } = await db().from('quote_checks').insert({
    guest_id: guestId,
    car_id: carId,
    input_kind: sample ? 'sample' : imageBase64 ? 'photo' : 'text',
    raw_text: sample?.text ?? text ?? null,
    parsed: lines,
    verdict,
    overpay_cents: verdict.overpayCents,
    is_sample: !!sample || !!carRow.is_sample,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = ent.data?.plan ?? 'free';
  return NextResponse.json({
    checkId: saved.id,
    verdict: forPlan(verdict, plan),
    plan: duePlan(car, history, today),
    recallsUnavailable: 'error' in recalls,
    userPlan: plan,
  });
}
