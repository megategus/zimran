import { describe, expect, it } from 'vitest';
import type { Car, ServiceRecord } from '../lib/types';
import { MileageWentDownError, planRecord } from '../lib/records/save';
import { duePlan } from '../lib/schedule/plan';
import { toIcs } from '../lib/records/ics';

const today = new Date('2026-11-14T12:00:00Z');
const car = (c: Partial<Car> = {}): Car => ({ id: 'car1', year: 2019, make: 'Toyota', model: 'Camry', state: 'TX', mileage: 40000, originalOwner: true, fuel: 'gas', ...c });
const rec = (mileage: number, jobKey: string, serviceDate = '2026-06-01'): ServiceRecord => ({
  id: `r${mileage}`, assetType: 'car', assetId: 'car1', serviceDate, mileage, source: 'manual', lines: [{ jobKey, label: jobKey, totalCents: 8000 }], totalCents: 8000,
});
const input = (mileage: number, jobKey = 'oil_change') => ({
  carId: 'car1', serviceDate: '2026-11-10', mileage, source: 'manual' as const, lines: [{ jobKey, label: 'Oil change', totalCents: 8995 }],
});

describe('planRecord', () => {
  it('rejects mileage lower than the latest record', () => {
    expect(() => planRecord(car(), [rec(41000, 'tire_rotation')], input(40500), today)).toThrow(MileageWentDownError);
  });

  it('accepts equal mileage, sums the total and raises the car mileage', () => {
    const p = planRecord(car(), [rec(41000, 'tire_rotation')], input(42000), today);
    expect(p.record.totalCents).toBe(8995);
    expect(p.carMileage).toBe(42000);
    expect(() => planRecord(car(), [rec(41000, 'tire_rotation')], input(41000), today)).not.toThrow();
  });

  it('saving an oil change moves the next oil change by the interval', () => {
    const before = planRecord(car(), [rec(30000, 'oil_change', '2026-06-01')], input(40000, 'tire_rotation'), today);
    const after = planRecord(car(), [rec(30000, 'oil_change', '2026-06-01')], input(40000), today);
    const oil = (p: typeof before) => duePlan({ ...car(), mileage: p.carMileage }, p.history, today).find((d) => d.jobKey === 'oil_change')!;
    expect(oil(before).dueMiles).toBe(40000); // Toyota: 10,000 mi
    expect(oil(before).overdue).toBe(false);
    expect(oil(after).dueMiles).toBe(50000);
    expect(after.reminders.some((r) => r.service_key === 'oil_change' && r.due_mileage === 50000)).toBe(true);
  });
});

describe('plan', () => {
  it('unknown make still returns the generic plan', () => {
    const plan = duePlan(car({ make: 'Lada', model: 'Niva' }), [], today);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((d) => d.source === 'Generic schedule (estimate)')).toBe(true);
  });

  it('ics has one VEVENT per dated item', () => {
    const items = [
      { jobKey: 'oil_change', label: 'Oil change', dueDate: '2027-01-10', dueMiles: 50000, overdue: false, source: 'x' },
      { jobKey: 'tire_rotation', label: 'Tire rotation', dueMiles: 45000, overdue: false, source: 'x' },
      { jobKey: 'brake_fluid', label: 'Brake fluid', dueDate: '2026-10-01', overdue: true, source: 'x' },
    ];
    const ics = toIcs(car(), items, today);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20270110');
    expect(ics).toContain('SUMMARY:Oil change - 2019 Toyota Camry');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });
});
