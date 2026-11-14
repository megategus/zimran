import { describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the Supabase client: just the calls lib/demo.ts makes.
const tables: Record<string, Record<string, unknown>[]> = {};
vi.mock('../lib/db', () => ({
  db: () => ({
    from: (t: string) => ({
      insert: async (rows: Record<string, unknown>[]) => { (tables[t] ??= []).push(...rows); return { error: null }; },
      select: () => {
        const filters: [string, unknown][] = [];
        const q = {
          eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
          then: (res: (r: unknown) => void) =>
            res({ error: null, data: (tables[t] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v)) }),
        };
        return q;
      },
    }),
  }),
}));
const { buildDemo, loadDemoProfile } = await import('../lib/demo');

const today = new Date('2026-11-14T12:00:00Z');

describe('demo profile', () => {
  const { carIds, rows } = buildDemo('g1', today);

  it('two cars, every sample-capable row labeled is_sample and owned by the guest', () => {
    expect(carIds).toHaveLength(2);
    for (const t of ['cars', 'service_records', 'quote_checks', 'documents'] as const) {
      expect(rows[t].length).toBeGreaterThan(0);
      expect(rows[t].every((r) => r.is_sample === true && r.guest_id === 'g1')).toBe(true);
    }
    expect(rows.reminders.every((r) => carIds.includes(r.car_id as string))).toBe(true);
  });

  it('quote verdicts are computed by checkQuote, not stored: padded coolant flush is an upsell', () => {
    const rav = rows.quote_checks[0].verdict as { lines: { status: string }[]; overpayCents: number };
    expect(rav.lines.map((l) => l.status)).toContain('upsell');
    expect(rav.overpayCents).toBeGreaterThan(0);
    const supplies = (rows.quote_checks[2].verdict as { lines: { status: string }[] }).lines[2];
    expect(supplies.status).toBe('unknown');
  });

  it('reminders come from the due plan and at least one is overdue (F-150 tire rotation)', () => {
    const f150 = carIds[1];
    expect(rows.reminders.some((r) => r.car_id === f150 && r.service_key === 'tire_rotation')).toBe(true);
  });

  it('loading twice for the same guest does not duplicate', async () => {
    const a = await loadDemoProfile('g2', today);
    const b = await loadDemoProfile('g2', today);
    expect(b.carIds.sort()).toEqual(a.carIds.sort());
    expect(tables.cars.filter((r) => r.guest_id === 'g2')).toHaveLength(2);
  });
});
