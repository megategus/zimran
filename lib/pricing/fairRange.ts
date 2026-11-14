import { laborFor, parts, stateRates } from '../seed';

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

/** Fair shop price = labor hours × state shop rate + parts, low and high. Null when we have no benchmark. */
export function fairRange(jobKey: string, state: string): { lowCents: number; highCents: number; basis: string } | null {
  const l = laborFor(jobKey);
  const r = stateRates.find((s) => s.state === state.toUpperCase());
  if (!l || !r) return null;
  const p = parts.find((x) => x.job_key === jobKey);
  const pLow = p?.parts_low_cents ?? 0, pHigh = p?.parts_high_cents ?? 0;
  const lowCents = Math.round(l.hours_low * r.shop_rate_low * 100 + pLow);
  const highCents = Math.round(l.hours_high * r.shop_rate_high * 100 + pHigh);
  const basis = `${l.hours_low}–${l.hours_high} h labor × $${r.shop_rate_low}–$${r.shop_rate_high}/h (${r.state} shop rate, estimate)` +
    (p ? ` + parts ${usd(pLow)}–${usd(pHigh)}` : '');
  return { lowCents, highCents, basis };
}
