import { describe, expect, it } from 'vitest';
import labor from '../db/seed/labor_hours.json';
import rates from '../db/seed/state_rates.json';
import parts from '../db/seed/parts.json';
import schedules from '../db/seed/schedules.json';
import warranty from '../db/seed/warranty.json';
import samples from '../db/seed/sample_quotes.json';

const tables = { labor, rates, parts, schedules, warranty, samples };
const jobs = new Set(labor.map((r) => r.job_key));

describe('seed tables', () => {
  it.each(Object.entries(tables))('%s: every row has source and as_of', (_, rows) => {
    for (const r of rows as { source: string; as_of: string }[]) {
      expect(r.source.trim()).not.toBe('');
      expect(r.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('job keys are unique and hour ranges are ordered', () => {
    expect(jobs.size).toBe(labor.length);
    for (const r of labor) expect(r.hours_low).toBeLessThanOrEqual(r.hours_high);
  });

  it('every job_key in schedules, parts and warranty exists in labor_hours', () => {
    const used = [
      ...schedules.map((r) => r.job_key),
      ...parts.map((r) => r.job_key),
      ...warranty.flatMap((w) => Object.values(w.covered_jobs as Record<string, string[]>).flat()),
    ];
    expect(used.filter((k) => !jobs.has(k))).toEqual([]);
  });

  it('has 50 states + DC with ordered shop rates', () => {
    expect(new Set(rates.map((r) => r.state)).size).toBe(51);
    for (const r of rates) expect(r.shop_rate_low).toBeLessThan(r.shop_rate_high);
  });

  it('parts ranges are ordered integer cents', () => {
    for (const p of parts) {
      expect(Number.isInteger(p.parts_low_cents)).toBe(true);
      expect(p.parts_low_cents).toBeLessThanOrEqual(p.parts_high_cents);
    }
  });

  it('warranty has the federal emissions row and the demo jobs', () => {
    const fed = warranty.find((w) => w.make === 'federal_emissions');
    expect(fed).toMatchObject({ basic_years: 8, basic_miles: 80000, covered_jobs: { emissions: ['catalytic_converter', 'ecu'] } });
    expect(warranty.find((w) => w.make === 'Hyundai')?.covered_jobs.powertrain).toContain('water_pump');
    expect(warranty.length).toBeGreaterThanOrEqual(16);
  });

  it('has sample quotes a, b, c with text', () => {
    expect(samples.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    for (const s of samples) expect(s.text.length).toBeGreaterThan(50);
  });
});
