import { NextResponse, type NextRequest } from 'next/server';
import { getGuestId } from '@/lib/guest';
import { grantPlus, grantsPlus, safeReturnPath, stripe } from '@/lib/entitlements';

/** Stripe redirects here after checkout. Verifies the session with Stripe, then unlocks Plus. */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  const back = new URL(safeReturnPath(req.nextUrl.searchParams.get('returnTo')), req.nextUrl.origin);
  if (!sessionId?.startsWith('cs_')) {
    back.searchParams.set('checkout', 'invalid');
    return NextResponse.redirect(back, 303);
  }
  const guestId = getGuestId(req);
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const ok = grantsPlus(session, guestId);
  if (ok) await grantPlus(guestId, session.id);
  back.searchParams.set('checkout', ok ? 'success' : 'failed');
  return NextResponse.redirect(back, 303);
}
