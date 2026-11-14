// Fixture tables in the Task 2 seed shape (stands in for lib/seed.ts in unit tests).
const s = { source: 'test', as_of: '2026-11-14' };

export const labor = [
  { ...s, job_key: 'brake_pads_front', label: 'Front brake pads', aliases: [], hours_low: 1, hours_high: 1.5 },
  { ...s, job_key: 'coolant_flush', label: 'Coolant flush', aliases: [], hours_low: 1, hours_high: 1.5 },
  { ...s, job_key: 'fuel_injector_cleaning', label: 'Fuel injector cleaning', aliases: [], hours_low: 1, hours_high: 1 },
  { ...s, job_key: 'oil_change', label: 'Oil change', aliases: [], hours_low: 0.3, hours_high: 0.5 },
  { ...s, job_key: 'hybrid_inverter_coolant', label: 'Inverter coolant', aliases: [], hours_low: 1, hours_high: 1 },
  { ...s, job_key: 'water_pump', label: 'Water pump', aliases: [], hours_low: 2, hours_high: 3 },
];
export const laborFor = (k: string) => labor.find((r) => r.job_key === k);
export const stateRates = [{ ...s, state: 'TX', shop_rate_low: 100, shop_rate_high: 150 }];
export const parts = [
  { ...s, job_key: 'brake_pads_front', parts_low_cents: 5000, parts_high_cents: 12000 },
  { ...s, job_key: 'oil_change', parts_low_cents: 3000, parts_high_cents: 6000 },
];
export const schedules = [
  { make: 'generic', job_key: 'oil_change', interval_miles: 5000, interval_months: 6 },
  { make: 'generic', job_key: 'coolant_flush', interval_miles: 30000, interval_months: 36 },
  { make: 'generic', job_key: 'fuel_injector_cleaning', interval_miles: 60000, interval_months: null },
  { make: 'Toyota', job_key: 'coolant_flush', interval_miles: 100000, interval_months: 120, severe_interval_miles: null, source: 'Toyota manual' },
  { make: 'Toyota', job_key: 'hybrid_inverter_coolant', interval_miles: 150000, interval_months: null, applies_to: { fuel: ['hybrid'] } },
];
export const warranty = [
  { ...s, make: 'Hyundai', basic_years: 5, basic_miles: 60000, powertrain_years: 10, powertrain_miles: 100000,
    powertrain_original_owner_only: { years: 5, miles: 60000 }, covered_jobs: { powertrain: ['water_pump'] } },
  { ...s, make: 'federal_emissions', basic_years: 8, basic_miles: 80000, covered_jobs: { emissions: ['catalytic_converter'] } },
];
