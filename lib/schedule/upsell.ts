import type { Car, ServiceRecord } from '../types';
import { laborFor, type ScheduleRow } from '../seed';
import { nextDue, scheduleFor } from './plan';

const GAP_MILES = 5000;
const GAP_MONTHS = 6;
const n = (x: number) => x.toLocaleString('en-US');

/** Is this job offered well before the maker's schedule says it's due? Null when the job has no schedule. */
export function upsellFlag(
  jobKey: string, car: Car, history: ServiceRecord[], today = new Date(), modelRows: ScheduleRow[] = [],
): { isUpsell: boolean; reason: string } | null {
  const row = scheduleFor(car, modelRows).find((r) => r.job_key === jobKey);
  if (!row) return null;
  const label = laborFor(jobKey)?.label ?? jobKey;
  const due = nextDue(row, car, history, today);
  const soonByDate = due.dueDate !== undefined && due.dueDate.getTime() - today.getTime() < GAP_MONTHS * 30.4 * 864e5;
  const farByMiles = due.dueMiles !== undefined && due.dueMiles - due.miles > GAP_MILES;
  if (!farByMiles || soonByDate) return { isUpsell: false, reason: `${label} is due now or soon on your maker's schedule.` };
  if (row.severe_interval_miles) {
    const severe = nextDue(row, car, history, today, row.severe_interval_miles);
    if (severe.dueMiles !== undefined && severe.dueMiles - due.miles <= GAP_MILES)
      return { isUpsell: false, reason: `${label} is due soon on the severe-driving schedule (towing, short trips, extreme heat).` };
  }
  return {
    isUpsell: true,
    reason: `Your maker's schedule puts ${label.toLowerCase()} at ${n(due.dueMiles!)} mi; you're at ${n(due.miles)} mi.`,
  };
}
