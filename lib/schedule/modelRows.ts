import { db } from '../db';
import type { ScheduleRow } from '../seed';
import type { Car } from '../types';

type ModelScheduleRow = {
  job_key: string; interval_miles: number | null; interval_months: number | null;
  severe_interval_miles: number | null; source: string;
};

/** Model-specific schedule rows (db 0003) for this car, or [] when its model is not loaded; callers fall back to make/generic rows. */
export async function modelRowsFor(car: Pick<Car, 'year' | 'make' | 'model'>): Promise<ScheduleRow[]> {
  const { data: models, error } = await db().from('vehicle_models').select('id')
    .eq('year', car.year).ilike('make', car.make).ilike('model', car.model).limit(1);
  if (error) throw new Error(error.message);
  if (!models?.length) return [];
  const { data, error: e2 } = await db().from('model_schedule')
    .select('job_key, interval_miles, interval_months, severe_interval_miles, source').eq('model_id', models[0].id);
  if (e2) throw new Error(e2.message);
  return ((data ?? []) as ModelScheduleRow[]).map((r) => ({ ...r, make: car.make }));
}
