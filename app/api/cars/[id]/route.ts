import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getGuestId } from '@/lib/guest';
import { carInput, fromRow, toRow } from '@/lib/vehicle/cars';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/cars/[id] → Car (404 if not this guest's)
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { data } = await db().from('cars').select('*').eq('id', id).eq('guest_id', getGuestId(req)).maybeSingle();
  return data ? NextResponse.json(fromRow(data)) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}

// PATCH /api/cars/[id] body: partial Car → Car
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parsed = carInput.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const { data, error } = await db().from('cars').update(toRow(parsed.data))
    .eq('id', id).eq('guest_id', getGuestId(req)).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return data ? NextResponse.json(fromRow(data)) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
