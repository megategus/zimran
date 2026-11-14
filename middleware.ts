import { NextResponse, type NextRequest } from 'next/server';
import { GUEST_COOKIE, GUEST_MAX_AGE, getGuestId } from './lib/guest';

// Sets the guest cookie on first visit, also on the request so route handlers see it right away.
export function middleware(req: NextRequest) {
  const id = getGuestId(req);
  if (req.cookies.get(GUEST_COOKIE)?.value === id) return NextResponse.next();
  req.cookies.set(GUEST_COOKIE, id);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: GUEST_MAX_AGE,
    path: '/',
  });
  return res;
}

export const config = { matcher: ['/((?!_next/|favicon|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)'] };
