import type { Car, DueService, ServiceRecord } from '../types';
import { laborFor, schedules, type ScheduleRow } from '../seed';

const applies = (row: ScheduleRow, car: Car) =>
  (!row.applies_to?.drivetrain || (!!car.drivetrain && row.applies_to.drivetrain.includes(car.drivetrain))) &&
  (!row.applies_to?.fuel || (!!car.fuel && row.applies_to.fuel.includes(car.fuel)));

/** One schedule row per job for this car: model rows (Task 2B) beat make rows, which beat generic. */
export function scheduleFor(car: Car, modelRows: ScheduleRow[] = []): ScheduleRow[] {
  const make = car.make.toLowerCase();
  const pick = new Map<string, ScheduleRow>();
  const tiers = [
    schedules.filter((r) => r.make === 'generic'),
    schedules.filter((r) => r.make.toLowerCase() === make),
    modelRows,
  ];
  for (const tier of tiers) for (const r of tier) if (applies(r, car)) pick.set(r.job_key, r);
  return [...pick.values()];
}

export const currentMiles = (car: Car, history: ServiceRecord[]) =>
  Math.max(car.mileage, ...history.map((h) => h.mileage));

const addMonths = (iso: string | Date, m: number) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d;
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const carStart = (car: Car) => car.purchaseDate ?? `${car.year}-01-01`;

/** Next due point for one schedule row, from the last time it was done, else interval multiples from 0. */
export function nextDue(row: ScheduleRow, car: Car, history: ServiceRecord[], today: Date, intervalMiles = row.interval_miles) {
  const miles = currentMiles(car, history);
  const last = history
    .filter((h) => h.lines.some((l) => l.jobKey === row.job_key))
    .sort((a, b) => b.mileage - a.mileage)[0];
  let dueMiles: number | undefined, dueDate: Date | undefined;
  if (last) {
    if (intervalMiles) dueMiles = last.mileage + intervalMiles;
    if (row.interval_months) dueDate = addMonths(last.serviceDate, row.interval_months);
  } else {
    if (intervalMiles) dueMiles = Math.max(1, Math.ceil(miles / intervalMiles)) * intervalMiles;
    if (row.interval_months) {
      const start = new Date(carStart(car));
      const months = (today.getUTCFullYear() - start.getUTCFullYear()) * 12 + today.getUTCMonth() - start.getUTCMonth();
      dueDate = addMonths(start, Math.max(1, Math.ceil(months / row.interval_months)) * row.interval_months);
    }
  }
  const overdue = (dueMiles !== undefined && miles > dueMiles) || (dueDate !== undefined && today > dueDate);
  return { dueMiles, dueDate, overdue, miles };
}

/** What is due next for this car, soonest first. */
export function duePlan(car: Car, history: ServiceRecord[], today: Date, modelRows: ScheduleRow[] = []): DueService[] {
  return scheduleFor(car, modelRows)
    .map((row) => {
      const { dueMiles, dueDate, overdue } = nextDue(row, car, history, today);
      const item: DueService = {
        jobKey: row.job_key,
        label: laborFor(row.job_key)?.label ?? row.job_key.replace(/_/g, ' '),
        overdue,
        source: row.make === 'generic' ? 'Generic schedule (estimate)' : row.source ?? `${row.make} schedule`,
      };
      if (dueMiles !== undefined) item.dueMiles = dueMiles;
      if (dueDate) item.dueDate = isoDate(dueDate);
      return item;
    })
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueMiles ?? Infinity) - (b.dueMiles ?? Infinity));
}
