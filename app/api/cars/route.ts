import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getGuestId } from '@/lib/guest';
import { carInput, fromRow, toRow } from '@/lib/vehicle/cars';

// GET /api/cars → Car[] for this guest
export async function GET(req: NextRequest) {
  const { data, error } = await db().from('cars').select('*').eq('guest_id', getGuestId(req)).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(fromRow));
}

// POST /api/cars body: Car without id → Car
export async function POST(req: NextRequest) {
  const parsed = carInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const { data, error } = await db().from('cars')
    .insert({ ...toRow(parsed.data), guest_id: getGuestId(req) }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(fromRow(data), { status: 201 });
}
