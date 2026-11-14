import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getGuestId } from '@/lib/guest';
import { fromRecordRow, type RecordRow } from '@/lib/records/rows';
import { MileageWentDownError, NotFoundError, recordInput, saveRecord } from '@/lib/records/save';

// GET /api/records?carId= → ServiceRecord[] newest first
export async function GET(req: NextRequest) {
  const carId = z.string().uuid().safeParse(req.nextUrl.searchParams.get('carId'));
  if (!carId.success) return NextResponse.json({ error: 'invalid', message: 'carId required' }, { status: 400 });
  const { data, error } = await db().from('service_records').select('*')
    .eq('asset_id', carId.data).eq('guest_id', getGuestId(req)).order('service_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data as RecordRow[]).map(fromRecordRow));
}

// POST /api/records body: { carId, serviceDate, mileage, source?, shop?, lines } or { carId, serviceDate, mileage, quoteCheckId } → 201 ServiceRecord
export async function POST(req: NextRequest) {
  const parsed = recordInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json(await saveRecord(getGuestId(req), parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof MileageWentDownError) return NextResponse.json({ error: 'mileage_went_down', message: e.message, latest: e.latest }, { status: 409 });
    if (e instanceof NotFoundError) return NextResponse.json({ error: 'not_found', what: e.message }, { status: 404 });
    throw e;
  }
}
