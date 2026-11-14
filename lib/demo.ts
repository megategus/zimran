// Synthetic demo owner (plan Task 2C): copied into the visitor's own guest_id, every row labeled is_sample.
import profile from '../db/seed/demo_profile.json';
import type { Car, QuoteLine, ServiceRecord } from './types';
import { checkQuote } from './quote/check';
import { remindersFor } from './records/save';
import { db } from './db';

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

type Rows = Record<'cars' | 'service_records' | 'quote_checks' | 'reminders' | 'documents', Record<string, unknown>[]>;

/** Pure: all rows for one guest, dated relative to `today`. Verdicts and reminders come from the real engines. */
export function buildDemo(guestId: string, today: Date, newId: () => string = () => crypto.randomUUID()): { carIds: string[]; rows: Rows } {
  const ago = (days: number) => new Date(today.getTime() - days * DAY);
  const cars = new Map<string, Car>();
  for (const { key, ...c } of profile.cars) cars.set(key, { id: newId(), ...(c as Omit<Car, 'id'>) });

  const history: ServiceRecord[] = profile.records.map((r) => {
    const lines = r.lines as ServiceRecord['lines'];
    return {
      id: newId(), assetType: 'car', assetId: cars.get(r.car)!.id, serviceDate: iso(ago(r.daysAgo)), mileage: r.mileage,
      source: 'manual', shop: r.shop, lines, totalCents: lines.reduce((s, l) => s + l.totalCents, 0),
    };
  });
  const historyOf = (carId: string, before = today) =>
    history.filter((h) => h.assetId === carId && new Date(h.serviceDate) < before);

  const quoteChecks = profile.quoteChecks.map((q) => {
    const at = ago(q.daysAgo);
    const car = { ...cars.get(q.car)!, mileage: q.mileage };
    const parsed = q.lines as QuoteLine[];
    // shortcut: no NHTSA call while loading the demo (recalls = []), the live check route does query it.
    const verdict = checkQuote(parsed, { car, history: historyOf(car.id, at), recalls: [], today: at });
    return {
      guest_id: guestId, car_id: car.id, input_kind: 'sample', raw_text: q.text, parsed, verdict,
      overpay_cents: verdict.overpayCents, is_sample: true, created_at: at.toISOString(),
    };
  });

  const reminders = [...cars.values()].flatMap((car) => remindersFor(car, historyOf(car.id), today).map((r) => ({ ...r, guest_id: guestId })));

  return {
    carIds: [...cars.values()].map((c) => c.id),
    rows: {
      cars: [...cars.values()].map((c) => ({
        id: c.id, guest_id: guestId, year: c.year, make: c.make, model: c.model, trim: c.trim, drivetrain: c.drivetrain,
        fuel: c.fuel, state: c.state, mileage: c.mileage, original_owner: c.originalOwner, purchase_date: c.purchaseDate, is_sample: true,
      })),
      service_records: history.map((h) => ({
        id: h.id, guest_id: guestId, asset_type: 'car', asset_id: h.assetId, service_date: h.serviceDate, mileage: h.mileage,
        source: h.source, shop: h.shop, lines: h.lines, total_cents: h.totalCents, is_sample: true,
      })),
      quote_checks: quoteChecks,
      reminders,
      documents: profile.documents.map((d) => ({
        guest_id: guestId, car_id: cars.get(d.car)!.id, kind: d.kind, expires_on: iso(new Date(today.getTime() + d.expiresInDays * DAY)), is_sample: true,
      })),
    },
  };
}

export const DEMO_OWNER = profile.owner;

/** Copies the demo owner into this guest. Idempotent: a guest that already has sample cars gets those ids back. */
export async function loadDemoProfile(guestId: string, today = new Date()): Promise<{ carIds: string[] }> {
  const existing = await db().from('cars').select('id').eq('guest_id', guestId).eq('is_sample', true);
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data.length) return { carIds: existing.data.map((r: { id: string }) => r.id) };

  const { carIds, rows } = buildDemo(guestId, today);
  // Parents first: the other tables reference cars(id).
  for (const table of ['cars', 'service_records', 'quote_checks', 'reminders', 'documents'] as const) {
    const { error } = await db().from(table).insert(rows[table]);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return { carIds };
}

export type SampleId = keyof typeof profile.sampleCars;
export const isSampleId = (id: string): id is SampleId => id in profile.sampleCars;

/** The labeled sample car that matches sample quote `id` (Civic/Elantra/Camry), created for this guest on first use. */
export async function ensureSampleCar(guestId: string, id: SampleId): Promise<string> {
  const c = profile.sampleCars[id];
  const found = await db().from('cars').select('id').eq('guest_id', guestId).eq('is_sample', true)
    .eq('year', c.year).eq('make', c.make).eq('model', c.model).limit(1);
  if (found.error) throw new Error(found.error.message);
  if (found.data.length) return found.data[0].id;
  const ins = await db().from('cars').insert({
    guest_id: guestId, year: c.year, make: c.make, model: c.model, trim: c.trim, drivetrain: c.drivetrain, fuel: c.fuel,
    state: c.state, mileage: c.mileage, original_owner: c.originalOwner, purchase_date: c.purchaseDate, is_sample: true,
  }).select('id').single();
  if (ins.error) throw new Error(ins.error.message);
  return ins.data.id;
}
