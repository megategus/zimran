// Plus plan: Stripe test-mode checkout grants it, entitlements.plan stores it per guest.
import Stripe from 'stripe';
import { db } from './db';
import type { Plan } from './types';

export const PRICES = { month: 599, year: 3999 } as const; // cents
export const TRIAL_DAYS = 7;

let client: Stripe | undefined;

/** Server-only Stripe client. Refuses live keys: the hackathon build must never charge real cards. */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key?.startsWith('sk_test_')) throw new Error('STRIPE_SECRET_KEY missing or not a test-mode key');
    client = new Stripe(key);
  }
  return client;
}

export async function getPlan(guestId: string): Promise<Plan> {
  const { data } = await db().from('entitlements').select('plan').eq('guest_id', guestId).maybeSingle<{ plan: Plan }>();
  return data?.plan ?? 'free';
}

/** A checkout session unlocks Plus only when it is complete and was started by this same guest. */
export function grantsPlus(
  s: Pick<Stripe.Checkout.Session, 'status' | 'client_reference_id' | 'mode'>, guestId: string,
): boolean {
  return s.status === 'complete' && s.mode === 'subscription' && !!s.client_reference_id && s.client_reference_id === guestId;
}

export async function grantPlus(guestId: string, sessionId: string) {
  const { error } = await db().from('entitlements').upsert(
    { guest_id: guestId, plan: 'plus', stripe_session_id: sessionId, updated_at: new Date().toISOString() },
    { onConflict: 'guest_id' },
  );
  if (error) throw new Error(error.message);
}

/** Only same-site paths, so the redirect after checkout can't send users to another site. */
export const safeReturnPath = (p: string | null | undefined) => (p && p.startsWith('/') && !p.startsWith('//') ? p : '/');
