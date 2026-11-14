import { NextResponse, type NextRequest } from 'next/server';
import { toIcs } from '@/lib/records/ics';
import { loadPlan } from '../load';

type Ctx = { params: Promise<{ carId: string }> };

// GET /api/plan/[carId]/ics → text/calendar, one all-day event per dated due item
export async function GET(req: NextRequest, { params }: Ctx) {
  const res = await loadPlan(req, (await params).carId);
  if (!res) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const name = `${res.car.year}-${res.car.make}-${res.car.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return new NextResponse(toIcs(res.car, res.plan), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${name}-maintenance.ics"` },
  });
}
