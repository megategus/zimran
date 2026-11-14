import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getGuestId } from '@/lib/guest';
import { PRICES, TRIAL_DAYS, safeReturnPath, stripe } from '@/lib/entitlements';

const body = z.object({ interval: z.enum(['month', 'year']), returnTo: z.string().max(200).optional() });

/** POST { interval, returnTo? } -> { url } of a Stripe test-mode Checkout Session for Plus. */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const { interval } = parsed.data;
  const returnTo = safeReturnPath(parsed.data.returnTo);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    client_reference_id: getGuestId(req),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: PRICES[interval],
        recurring: { interval },
        product_data: { name: 'Counter Check Plus' },
      },
    }],
    subscription_data: { trial_period_days: TRIAL_DAYS },
    success_url: `${origin}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`,
    cancel_url: `${origin}${returnTo}`,
  });
  return NextResponse.json({ url: session.url });
}
