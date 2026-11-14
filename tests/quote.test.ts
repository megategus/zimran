import { describe, expect, it, vi } from 'vitest';
import type { Car, QuoteLine } from '../lib/types';

vi.mock('../lib/seed', () => import('./fixtures/seed'));
const { checkQuote, NoLinesError } = await import('../lib/quote/check');

const today = new Date('2026-11-14');
const car = (c: Partial<Car> = {}): Car => ({ id: 'c', year: 2019, make: 'Toyota', model: 'Camry', state: 'TX', mileage: 45000, originalOwner: true, fuel: 'gas', ...c });
const line = (jobKey: string | null, dollars: number): QuoteLine => ({ raw: `${jobKey} $${dollars}`, jobKey, totalCents: dollars * 100 });
const ctx = (c = car()) => ({ car: c, history: [], recalls: [], today });

describe('checkQuote', () => {
  it('padded quote: 2 upsell lines, overpay = their totals', () => {
    const v = checkQuote([line('oil_change', 60), line('coolant_flush', 189), line('fuel_injector_cleaning', 149)], ctx(car({ mileage: 44800 })));
    expect(v.lines.map((l) => l.status)).toEqual(['fair', 'upsell', 'upsell']);
    expect(v.overpayCents).toBe(18900 + 14900);
    expect(v.flaggedCount).toBe(2);
    expect(v.totalCents).toBe(39800);
  });
  it('coolant flush with a water pump on the same quote is not an upsell', () => {
    const v = checkQuote([line('water_pump', 640), line('coolant_flush', 120)], ctx(car({ mileage: 44800 })));
    expect(v.lines[1].status).not.toBe('upsell');
  });
  it('"shop supplies $35" → unknown, excluded from overpay', () => {
    const v = checkQuote([line(null, 35)], ctx());
    expect(v.lines[0]).toMatchObject({ status: 'unknown', overpayCents: 0, reason: 'No benchmark for this line.' });
    expect(v.flaggedCount).toBe(0);
  });
  it('line above the fair high → overpay = difference', () => {
    const v = checkQuote([line('brake_pads_front', 420)], ctx()); // fair $150–$345
    expect(v.lines[0]).toMatchObject({ status: 'high', overpayCents: 42000 - 34500, fairHighCents: 34500 });
    expect(v.lines[0].sayToShop).toContain('$345');
  });
  it('warranty beats price: Elantra water pump inside powertrain warranty', () => {
    const v = checkQuote([line('water_pump', 640)], ctx(car({ year: 2018, make: 'Hyundai', model: 'Elantra', mileage: 62000 })));
    expect(v.lines[0]).toMatchObject({ status: 'warranty', overpayCents: 64000 });
  });
  it('recall beats warranty', () => {
    const c = { ...ctx(car({ year: 2018, make: 'Hyundai', mileage: 62000 })), recalls: [{ campaign: '19V001000', component: 'ENGINE AND ENGINE COOLING:WATER PUMP', summary: '', remedy: '' }] };
    expect(checkQuote([line('water_pump', 640)], c).lines[0].status).toBe('recall');
  });
  it('empty lines → NoLinesError', () => {
    expect(() => checkQuote([], ctx())).toThrow(NoLinesError);
  });
});

describe('parseQuote', async () => {
  const { parseQuote, QuoteParseError } = await import('../lib/quote/parse');
  const client = (...outputs: unknown[]) => {
    const parse = vi.fn();
    for (const o of outputs) parse.mockResolvedValueOnce({ parsed_output: o });
    return { messages: { parse } } as never;
  };
  it('maps model output; unknown keys become null', async () => {
    const c = client({ lines: [
      { raw: 'Coolant flush $189', job_key: 'coolant_flush', labor_hours: null, parts_cents: null, total_cents: 18900 },
      { raw: 'Shop supplies $35', job_key: 'shop_supplies', labor_hours: null, parts_cents: null, total_cents: 3500 },
    ] });
    expect(await parseQuote({ text: 'x' }, c)).toEqual([
      { raw: 'Coolant flush $189', jobKey: 'coolant_flush', totalCents: 18900 },
      { raw: 'Shop supplies $35', jobKey: null, totalCents: 3500 },
    ]);
  });
  it('retries once on invalid output, then throws', async () => {
    const c = client(null, null);
    await expect(parseQuote({ text: 'x' }, c)).rejects.toBeInstanceOf(QuoteParseError);
    expect((c as { messages: { parse: ReturnType<typeof vi.fn> } }).messages.parse).toHaveBeenCalledTimes(2);
  });
});
