import { describe, expect, it, vi } from 'vitest';
import type { Car, ServiceRecord } from '../lib/types';

// Fixture tables in the Task 2 seed shape; the real tables arrive with Task 2.
vi.mock('../lib/seed', () => import('./fixtures/seed'));

const { fairRange } = await import('../lib/pricing/fairRange');
const { duePlan } = await import('../lib/schedule/plan');
const { upsellFlag } = await import('../lib/schedule/upsell');
const { warrantyCoverage } = await import('../lib/warranty/coverage');

const today = new Date('2026-11-14');
const car = (c: Partial<Car>): Car => ({ id: 'c', year: 2019, make: 'Toyota', model: 'Camry', state: 'TX', mileage: 45000, originalOwner: true, fuel: 'gas', ...c });
const rec = (jobKey: string, mileage: number, serviceDate: string): ServiceRecord => ({
  id: 'r', assetType: 'car', assetId: 'c', serviceDate, mileage, source: 'manual', lines: [{ jobKey, label: jobKey, totalCents: 1 }], totalCents: 1,
});

describe('fairRange', () => {
  it('brake pads TX = hours × rate + parts', () => {
    const r = fairRange('brake_pads_front', 'tx')!;
    expect([r.lowCents, r.highCents]).toEqual([1 * 100 * 100 + 5000, 1.5 * 150 * 100 + 12000]); // $150–$345
    expect(r.basis).toContain('TX');
  });
  it('null for unknown job or state', () => {
    expect(fairRange('nope', 'TX')).toBeNull();
    expect(fairRange('brake_pads_front', 'ZZ')).toBeNull();
  });
});

describe('upsellFlag', () => {
  it('coolant flush at 45,000 mi on a Toyota with 100,000-mi interval is an upsell', () => {
    expect(upsellFlag('coolant_flush', car({}), [], today)).toMatchObject({ isUpsell: true });
  });
  it('oil change due soon is not an upsell', () => {
    expect(upsellFlag('oil_change', car({ mileage: 49000 }), [rec('oil_change', 44500, '2026-08-01')], today)).toMatchObject({ isUpsell: false });
  });
  it('null when the job has no schedule', () => {
    expect(upsellFlag('brake_pads_front', car({}), [], today)).toBeNull();
  });
});

describe('duePlan', () => {
  it('make row overrides generic; done record moves the next due', () => {
    const plan = duePlan(car({ mileage: 47000 }), [rec('oil_change', 45000, '2026-09-01')], today);
    expect(plan.find((d) => d.jobKey === 'coolant_flush')?.dueMiles).toBe(100000);
    expect(plan.find((d) => d.jobKey === 'oil_change')).toMatchObject({ dueMiles: 50000, dueDate: '2027-03-01', overdue: false });
  });
  it('flags overdue', () => {
    expect(duePlan(car({ mileage: 51000 }), [rec('oil_change', 45000, '2026-09-01')], today)[0]).toMatchObject({ jobKey: 'oil_change', overdue: true });
  });
  it('hybrid-only row excluded for a gas car, included for a hybrid', () => {
    expect(duePlan(car({}), [], today).some((d) => d.jobKey === 'hybrid_inverter_coolant')).toBe(false);
    expect(duePlan(car({ fuel: 'hybrid' }), [], today).some((d) => d.jobKey === 'hybrid_inverter_coolant')).toBe(true);
  });
  it('unknown make gets the generic plan', () => {
    const plan = duePlan(car({ make: 'Lada' }), [], today);
    expect(plan.find((d) => d.jobKey === 'coolant_flush')).toMatchObject({ dueMiles: 60000, source: 'Generic schedule (estimate)' });
  });
});

describe('warrantyCoverage', () => {
  const elantra = car({ year: 2018, make: 'Hyundai', model: 'Elantra', mileage: 62000 });
  it('2018 Elantra original owner, 62,000 mi, water pump → likely (10 yr/100k)', () => {
    expect(warrantyCoverage(elantra, 'water_pump', today)).toMatchObject({ status: 'likely', until: { miles: 100000 } });
  });
  it('same car second owner → not covered beyond 5 yr/60k', () => {
    expect(warrantyCoverage({ ...elantra, originalOwner: false }, 'water_pump', today).status).toBe('not_covered');
  });
  it('maintenance item → not covered; unknown make → unknown', () => {
    expect(warrantyCoverage(elantra, 'oil_change', today).status).toBe('not_covered');
    expect(warrantyCoverage(car({ make: 'Lada' }), 'water_pump', today).status).toBe('unknown');
  });
  it('federal emissions covers the catalytic converter for any make within 8 yr/80k', () => {
    expect(warrantyCoverage(car({ make: 'Lada', year: 2022, mileage: 30000 }), 'catalytic_converter', today).status).toBe('likely');
  });
  it('close to the end without a purchase date → possibly', () => {
    expect(warrantyCoverage({ ...elantra, year: 2017, mileage: 70000 }, 'water_pump', today).status).toBe('possibly');
  });
});
