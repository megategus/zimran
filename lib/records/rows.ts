import type { ServiceRecord } from '../types';

// Shape of a `service_records` row (db/migrations/0001_init.sql).
export type RecordRow = {
  id: string; asset_type: 'car'; asset_id: string; service_date: string; mileage: number;
  source: ServiceRecord['source']; shop: string | null; lines: ServiceRecord['lines']; total_cents: number;
};

export const fromRecordRow = (r: RecordRow): ServiceRecord => ({
  id: r.id, assetType: 'car', assetId: r.asset_id, serviceDate: r.service_date, mileage: r.mileage,
  source: r.source, ...(r.shop ? { shop: r.shop } : {}), lines: r.lines ?? [], totalCents: r.total_cents,
});
