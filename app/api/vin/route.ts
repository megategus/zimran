import { NextResponse, type NextRequest } from 'next/server';
import { decodeVin } from '@/lib/vehicle/vin';

// GET /api/vin?vin=... → Partial<Car> | { error }
export async function GET(req: NextRequest) {
  const r = await decodeVin(req.nextUrl.searchParams.get('vin') ?? '');
  if ('error' in r) {
    const message = r.error === 'invalid' ? 'VIN not recognized, enter year/make/model' : "Couldn't reach NHTSA, enter year/make/model";
    return NextResponse.json({ error: r.error, message }, { status: r.error === 'invalid' ? 422 : 503 });
  }
  return NextResponse.json(r);
}
