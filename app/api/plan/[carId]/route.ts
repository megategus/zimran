import { NextResponse, type NextRequest } from 'next/server';
import { loadPlan } from './load';

type Ctx = { params: Promise<{ carId: string }> };

// GET /api/plan/[carId] → DueService[] (overdue first, then soonest)
export async function GET(req: NextRequest, { params }: Ctx) {
  const res = await loadPlan(req, (await params).carId);
  return res ? NextResponse.json(res.plan) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
