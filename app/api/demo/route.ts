import { NextResponse, type NextRequest } from 'next/server';
import { getGuestId } from '@/lib/guest';
import { DEMO_OWNER, loadDemoProfile } from '@/lib/demo';

// POST /api/demo → { carIds, owner }: loads the labeled sample owner into this guest (idempotent).
export async function POST(req: NextRequest) {
  try {
    const { carIds } = await loadDemoProfile(getGuestId(req));
    return NextResponse.json({ carIds, owner: DEMO_OWNER });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
