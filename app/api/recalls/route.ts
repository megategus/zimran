import { NextResponse, type NextRequest } from 'next/server';
import { getRecalls } from '@/lib/vehicle/recalls';

// GET /api/recalls?make=&model=&year= → { items } | { error, message }
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const make = p.get('make'), model = p.get('model'), year = Number(p.get('year'));
  if (!make || !model || !Number.isInteger(year)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const r = await getRecalls({ make, model, year });
  if ('error' in r) return NextResponse.json({ ...r, message: "Couldn't reach NHTSA, try again" }, { status: 503 });
  return NextResponse.json(r);
}
