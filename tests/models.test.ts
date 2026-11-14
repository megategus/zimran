import { describe, expect, it } from 'vitest';
import data from '../db/seed/models.json';
import labor from '../db/seed/labor_hours.json';

const jobs = new Set(labor.map((r) => r.job_key));
const { models, model_schedule, model_guides, model_common_issues } = data;

describe('demo models', () => {
  it('has the 3 demo cars', () => {
    expect(models.map((m) => m.id).sort()).toEqual(
      ['2019-ford-f-150-2.7-4wd', '2020-chevrolet-silverado-1500-5.3-4wd', '2021-toyota-rav4-hybrid-awd'],
    );
  });

  it.each(models.map((m) => m.id))('%s has 5+ maintenance and 3+ repair guides with steps and source', (id) => {
    const g = model_guides.filter((x) => x.model_id === id);
    expect(g.filter((x) => x.kind === 'maintenance').length).toBeGreaterThanOrEqual(5);
    expect(g.filter((x) => x.kind === 'repair').length).toBeGreaterThanOrEqual(3);
    for (const x of g) {
      expect(x.steps.length).toBeGreaterThan(0);
      expect(x.source).not.toBe('');
    }
    expect(model_common_issues.some((x) => x.model_id === id)).toBe(true);
  });

  it('schedules use known jobs and differ between every pair of cars', () => {
    for (const r of model_schedule) expect(jobs.has(r.job_key)).toBe(true);
    const key = (id: string) => new Map(model_schedule.filter((r) => r.model_id === id).map((r) => [r.job_key, r.interval_miles]));
    const ids = models.map((m) => m.id);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = key(ids[i]), b = key(ids[j]);
        expect([...a].some(([k, v]) => b.get(k) !== v)).toBe(true);
      }
  });

  it('guide job keys exist when set', () => {
    for (const g of model_guides) if (g.job_key) expect(jobs.has(g.job_key)).toBe(true);
  });
});
