import type { Car } from '../types';
import { warranty, type Limit, type WarrantyRow } from '../seed';
import { carStart } from '../schedule/plan';

export type Coverage = {
  status: 'likely' | 'possibly' | 'not_covered' | 'unknown';
  reason: string;
  until?: { date?: string; miles?: number };
};

const YEAR_MS = 365.25 * 864e5;
const n = (x: number) => x.toLocaleString('en-US');

function limitFor(row: WarrantyRow, category: string, car: Car): Limit | null {
  if (category === 'powertrain' && row.powertrain_years && row.powertrain_miles) {
    if (!car.originalOwner && row.powertrain_original_owner_only) return row.powertrain_original_owner_only;
    return { years: row.powertrain_years, miles: row.powertrain_miles };
  }
  if (category === 'hybrid' && row.hybrid_years && row.hybrid_miles) return { years: row.hybrid_years, miles: row.hybrid_miles };
  if (category === 'basic' || category === 'emissions') return { years: row.basic_years, miles: row.basic_miles };
  return null;
}

/** Is this job likely a free warranty repair for this car today? */
export function warrantyCoverage(car: Car, jobKey: string, today: Date): Coverage {
  const makeRow = warranty.find((w) => w.make.toLowerCase() === car.make.toLowerCase());
  const federal = warranty.find((w) => w.make === 'federal_emissions');
  const hit = [makeRow, federal]
    .filter((r): r is WarrantyRow => !!r)
    .flatMap((row) => Object.entries(row.covered_jobs).filter(([, jobs]) => jobs?.includes(jobKey)).map(([cat]) => ({ row, cat })))
    .map(({ row, cat }) => ({ row, cat, limit: limitFor(row, cat, car) }))
    .find((x) => x.limit);
  if (!hit) {
    return makeRow
      ? { status: 'not_covered', reason: 'Maintenance or wear item, not covered by the factory warranty.' }
      : { status: 'unknown', reason: 'Warranty unknown for this make, check your manual.' };
  }
  const { row, cat, limit } = hit as { row: WarrantyRow; cat: string; limit: Limit };
  const start = new Date(carStart(car));
  const untilDate = new Date(start.getTime() + limit.years * YEAR_MS);
  const until = { date: untilDate.toISOString().slice(0, 10), miles: limit.miles };
  const name = row.make === 'federal_emissions' ? 'Federal emissions warranty' : `${row.make} ${cat} warranty`;
  const terms = `${name}: ${limit.years} yr / ${n(limit.miles)} mi${cat === 'powertrain' && !car.originalOwner && row.powertrain_original_owner_only ? ' for a second owner' : ''}`;
  if (today >= untilDate || car.mileage >= limit.miles)
    return { status: 'not_covered', reason: `${terms}, expired at your age or mileage.`, until };
  // Without a purchase date the age is a guess from the model year, so close calls are only "possibly".
  const close = !car.purchaseDate && untilDate.getTime() - today.getTime() < YEAR_MS;
  return {
    status: close ? 'possibly' : 'likely',
    reason: `${terms}. You're at ${n(car.mileage)} mi${close ? '; confirm your in-service date with the dealer' : ''}.`,
    until,
  };
}
