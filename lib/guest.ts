// Guest identity: no login on the core flow, so every row is keyed by this cookie id.
export const GUEST_COOKIE = 'cc_guest';
export const GUEST_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, seconds

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type HasCookies = { cookies: { get(name: string): { value: string } | undefined } };

/** Returns the guest id from the cookie, or a fresh uuid v4 when it is missing or malformed. */
export function getGuestId(req: HasCookies): string {
  const v = req.cookies.get(GUEST_COOKIE)?.value;
  return v && UUID.test(v) ? v : crypto.randomUUID();
}
