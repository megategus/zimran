import { describe, expect, it } from 'vitest';
import shops from '../db/seed/shops_austin.json';
import prices from '../db/seed/shop_prices_austin.json';
import labor from '../db/seed/labor_hours.json';

const DEMO_ZIPS = ['78704', '78745'];
const jobs = new Set(labor.map((r) => r.job_key));

describe('Austin demo shops and prices', () => {
  it('has at least 15 shops, all in the demo ZIPs, each from OSM', () => {
    expect(shops.length).toBeGreaterThanOrEqual(15);
    for (const s of shops) {
      expect(DEMO_ZIPS).toContain(s.zip);
      expect(s.source).toContain('openstreetmap.org');
      expect(['dealer', 'independent', 'chain', 'tire']).toContain(s.kind);
    }
    expect(new Set(shops.map((s) => s.osm_id)).size).toBe(shops.length);
  });

  it('every price has a source URL, date, known job and known shop', () => {
    const osmIds = new Set(shops.map((s) => s.osm_id));
    for (const p of prices) {
      expect(p.source_url).toMatch(/^https:\/\//);
      expect(p.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(jobs.has(p.job_key)).toBe(true);
      expect(osmIds.has(p.shop_osm_id)).toBe(true);
      expect(Number.isInteger(p.price_cents)).toBe(true);
    }
  });
});
