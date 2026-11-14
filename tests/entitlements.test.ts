import { describe, expect, it } from 'vitest';
import { PRICES, grantsPlus, safeReturnPath } from '../lib/entitlements';

const guest = '11111111-1111-4111-8111-111111111111';
const session = (over: Partial<Parameters<typeof grantsPlus>[0]> = {}) => ({
  status: 'complete' as const, client_reference_id: guest, mode: 'subscription' as const, ...over,
});

describe('grantsPlus', () => {
  it('grants Plus for a completed session of this guest', () => {
    expect(grantsPlus(session(), guest)).toBe(true);
  });
  it('does not grant Plus to a different guest', () => {
    expect(grantsPlus(session(), '22222222-2222-4222-8222-222222222222')).toBe(false);
  });
  it('does not grant Plus for an open or expired session', () => {
    expect(grantsPlus(session({ status: 'open' }), guest)).toBe(false);
    expect(grantsPlus(session({ status: 'expired' }), guest)).toBe(false);
  });
  it('does not grant Plus when the session has no guest', () => {
    expect(grantsPlus(session({ client_reference_id: null }), guest)).toBe(false);
  });
});

describe('prices and redirects', () => {
  it('charges $5.99/mo and $39.99/yr', () => {
    expect(PRICES).toEqual({ month: 599, year: 3999 });
  });
  it('only redirects to same-site paths', () => {
    expect(safeReturnPath('/check/abc')).toBe('/check/abc');
    expect(safeReturnPath('https://evil.example')).toBe('/');
    expect(safeReturnPath('//evil.example')).toBe('/');
    expect(safeReturnPath(null)).toBe('/');
  });
});
