import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getGuestId } from '@/lib/guest';
import { duePlan } from '@/lib/schedule/plan';
import { fromRecordRow, type RecordRow } from '@/lib/records/rows';
import { fromRow, type CarRow } from '@/lib/vehicle/cars';

/** This guest's car and its due plan, or null if the car is not theirs. */
export async function loadPlan(req: NextRequest, carId: string, today = new Date()) {
  const guestId = getGuestId(req);
  const [{ data: carRow }, { data: rows }] = await Promise.all([
    db().from('cars').select('*').eq('id', carId).eq('guest_id', guestId).maybeSingle<CarRow>(),
    db().from('service_records').select('*').eq('asset_id', carId).eq('guest_id', guestId),
  ]);
  if (!carRow) return null;
  const car = fromRow(carRow);
  return { car, plan: duePlan(car, ((rows ?? []) as RecordRow[]).map(fromRecordRow), today) };
}
