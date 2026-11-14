// Typed access to the sourced seed tables (db/seed, Task 2). Field names match the plan exactly.
import laborJson from '../db/seed/labor_hours.json';
import ratesJson from '../db/seed/state_rates.json';
import partsJson from '../db/seed/parts.json';
import schedulesJson from '../db/seed/schedules.json';
import warrantyJson from '../db/seed/warranty.json';

type Sourced = { source: string; as_of: string };
export type LaborRow = Sourced & { job_key: string; label: string; aliases: string[]; hours_low: number; hours_high: number };
export type StateRateRow = Sourced & { state: string; shop_rate_low: number; shop_rate_high: number }; // USD per hour
export type PartsRow = Sourced & { job_key: string; parts_low_cents: number; parts_high_cents: number };
export type ScheduleRow = Partial<Sourced> & {
  make: string; // "generic" or a make
  job_key: string;
  interval_miles?: number | null;
  interval_months?: number | null;
  severe_interval_miles?: number | null;
  applies_to?: { drivetrain?: string[]; fuel?: string[] } | null;
};
export type Limit = { years: number; miles: number };
export type WarrantyRow = Sourced & {
  make: string; // a make, or "federal_emissions"
  basic_years: number; basic_miles: number;
  powertrain_years?: number; powertrain_miles?: number;
  powertrain_original_owner_only?: Limit; // limits that apply when the owner is NOT the original owner
  hybrid_years?: number; hybrid_miles?: number;
  covered_jobs: Partial<Record<string, string[]>>; // category ("powertrain" | "hybrid" | "basic" | "emissions") → job_keys
};

export const labor = laborJson as LaborRow[];
export const stateRates = ratesJson as StateRateRow[];
export const parts = partsJson as PartsRow[];
export const schedules = schedulesJson as ScheduleRow[];
export const warranty = warrantyJson as WarrantyRow[];

export const laborFor = (jobKey: string) => labor.find((r) => r.job_key === jobKey);
