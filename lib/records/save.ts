import { z } from 'zod';
import type { Car, QuoteLine, ServiceRecord } from '../types';
import { duePlan } from '../schedule/plan';
import { laborFor } from '../seed';
import { db } from '../db';
import { fromRow, type CarRow } from '../vehicle/cars';
import { fromRecordRow, type RecordRow } from './rows';

export class MileageWentDownError extends Error {
  constructor(public latest: number) { super(`Mileage can't go below your last record (${latest.toLocaleString('en-US')} mi)`); }
}
export class NotFoundError extends Error {}

// Trust boundary for POST /api/records. Either lines, or a quoteCheckId to save a checked quote.
export const recordInput = z.object({
  carId: z.string().uuid(),
  serviceDate: z.string().date(),
  mileage: z.number().int().min(0).max(1_000_000),
  source: z.enum(['manual', 'voice', 'quote', 'import']).default('manual'),
  shop: z.string().trim().max(80).optional(),
  lines: z.array(z.object({
    jobKey: z.string().max(40).nullable(),
    label: z.string().trim().min(1).max(120),
    totalCents: z.number().int().min(0).max(10_000_000),
  })).max(50).default([]),
  quoteCheckId: z.string().uuid().optional(),
}).refine((r) => r.lines.length || r.quoteCheckId, { message: 'Send lines or a quoteCheckId' });
export type RecordInput = z.input<typeof recordInput>;

type ReminderRow = { car_id: string; service_key: string; due_mileage: number | null; due_date: string | null };

/** Open reminders for a car: everything overdue plus the next two upcoming items of its due plan. */
export function remindersFor(car: Car, history: ServiceRecord[], today: Date): ReminderRow[] {
  const plan = duePlan(car, history, today);
  return [...plan.filter((d) => d.overdue), ...plan.filter((d) => !d.overdue).slice(0, 2)].map((d) => ({
    car_id: car.id, service_key: d.jobKey, due_mileage: d.dueMiles ?? null, due_date: d.dueDate ?? null,
  }));
}

/** Pure: validates and builds the new record, the car's new mileage and the regenerated reminders. */
export function planRecord(car: Car, history: ServiceRecord[], input: Omit<RecordInput, 'quoteCheckId'>, today: Date, id = crypto.randomUUID()) {
  const latest = Math.max(0, ...history.map((h) => h.mileage));
  if (input.mileage < latest) throw new MileageWentDownError(latest);
  const lines = input.lines ?? [];
  const record: ServiceRecord = {
    id, assetType: 'car', assetId: car.id, serviceDate: input.serviceDate, mileage: input.mileage,
    source: input.source ?? 'manual', ...(input.shop ? { shop: input.shop } : {}),
    lines, totalCents: lines.reduce((s, l) => s + l.totalCents, 0),
  };
  const carMileage = Math.max(car.mileage, input.mileage);
  const nextHistory = [...history, record];
  return { record, carMileage, history: nextHistory, reminders: remindersFor({ ...car, mileage: carMileage }, nextHistory, today) };
}

/** Saves a service record for this guest's car, bumps cars.mileage and regenerates its open reminders. */
export async function saveRecord(guestId: string, raw: RecordInput, today = new Date()): Promise<ServiceRecord> {
  const input = recordInput.parse(raw);
  const { data: carRow } = await db().from('cars').select('*').eq('id', input.carId).eq('guest_id', guestId).maybeSingle<CarRow>();
  if (!carRow) throw new NotFoundError('car');

  let lines = input.lines;
  let source = input.source;
  if (input.quoteCheckId) {
    const { data: check } = await db().from('quote_checks').select('parsed')
      .eq('id', input.quoteCheckId).eq('guest_id', guestId).eq('car_id', input.carId).maybeSingle<{ parsed: QuoteLine[] | null }>();
    if (!check) throw new NotFoundError('quote_check');
    lines = (check.parsed ?? []).map((l) => ({ jobKey: l.jobKey, label: (l.jobKey && laborFor(l.jobKey)?.label) || l.raw, totalCents: l.totalCents }));
    source = 'quote';
  }

  const { data: rows, error: histErr } = await db().from('service_records').select('*').eq('asset_id', input.carId).eq('guest_id', guestId);
  if (histErr) throw new Error(histErr.message);
  const plan = planRecord(fromRow(carRow), ((rows ?? []) as RecordRow[]).map(fromRecordRow), { ...input, lines, source }, today);
  const r = plan.record;

  const ins = await db().from('service_records').insert({
    id: r.id, guest_id: guestId, asset_type: 'car', asset_id: r.assetId, service_date: r.serviceDate, mileage: r.mileage,
    source: r.source, shop: r.shop ?? null, lines: r.lines, total_cents: r.totalCents, is_sample: !!carRow.is_sample,
  });
  if (ins.error) throw new Error(ins.error.message);
  if (plan.carMileage !== carRow.mileage) {
    const up = await db().from('cars').update({ mileage: plan.carMileage }).eq('id', r.assetId).eq('guest_id', guestId);
    if (up.error) throw new Error(up.error.message);
  }
  // Replace open reminders; done/dismissed ones stay as history.
  const del = await db().from('reminders').delete().eq('car_id', r.assetId).eq('guest_id', guestId).eq('status', 'open');
  if (del.error) throw new Error(del.error.message);
  if (plan.reminders.length) {
    const rem = await db().from('reminders').insert(plan.reminders.map((x) => ({ ...x, guest_id: guestId })));
    if (rem.error) throw new Error(rem.error.message);
  }
  return r;
}
