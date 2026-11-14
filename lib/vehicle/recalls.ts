import type { Car } from '../types';

export type Recall = { campaign: string; component: string; summary: string; remedy: string };
export type RecallResult = { items: Recall[] } | { error: 'unavailable' };

/** Model-level recalls from NHTSA (not VIN-specific: UI copy says "Recalls for this model"). */
export async function getRecalls(car: Pick<Car, 'make' | 'model' | 'year'>): Promise<RecallResult> {
  const q = new URLSearchParams({ make: car.make, model: car.model, modelYear: String(car.year) });
  try {
    const res = await fetch(`https://api.nhtsa.gov/recalls/recallsByVehicle?${q}`, {
      signal: AbortSignal.timeout(5000),
    });
    // NHTSA answers 400 for a make/model it doesn't know: that means no recalls, not an outage.
    if (res.status === 400) return { items: [] };
    if (!res.ok) return { error: 'unavailable' };
    const data = await res.json();
    return {
      items: (data.results ?? []).map((r: Record<string, string>) => ({
        campaign: r.NHTSACampaignNumber,
        component: r.Component,
        summary: r.Summary,
        remedy: r.Remedy,
      })),
    };
  } catch {
    return { error: 'unavailable' };
  }
}
