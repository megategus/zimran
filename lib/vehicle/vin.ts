import type { Car, Drivetrain, Fuel } from '../types';

const TIMEOUT_MS = 5000;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/; // 17 chars, no I, O, Q

export type VinResult = Partial<Car> | { error: 'invalid' | 'unavailable' };

export function mapDrive(s = ''): Drivetrain | undefined {
  if (/4WD|4x4/i.test(s)) return '4wd';
  if (/AWD|All.Wheel/i.test(s)) return 'awd';
  if (/FWD|Front/i.test(s)) return 'fwd';
  if (/RWD|Rear/i.test(s)) return 'rwd';
}

export function mapFuel(primary = '', electrification = ''): Fuel | undefined {
  if (/BEV/i.test(electrification)) return 'ev';
  if (/HEV/i.test(electrification)) return 'hybrid'; // HEV, PHEV, mild HEV
  if (/diesel/i.test(primary)) return 'diesel';
  if (/electric/i.test(primary)) return 'ev';
  if (/gasoline|flexible/i.test(primary)) return 'gas';
}

/** Decodes a VIN with NHTSA vPIC. Errors are values, never throws. */
export async function decodeVin(vin: string): Promise<VinResult> {
  const v = vin.trim().toUpperCase();
  if (!VIN_RE.test(v)) return { error: 'invalid' };
  let r: Record<string, string>;
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${v}?format=json`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { error: 'unavailable' };
    r = (await res.json()).Results?.[0] ?? {};
  } catch {
    return { error: 'unavailable' };
  }
  if (r.ErrorCode !== '0' || !r.Make || !r.ModelYear) return { error: 'invalid' };
  const out: Partial<Car> = { vin: v, year: Number(r.ModelYear), make: r.Make, model: r.Model };
  if (r.Trim) out.trim = r.Trim;
  const drivetrain = mapDrive(r.DriveType);
  if (drivetrain) out.drivetrain = drivetrain;
  const fuel = mapFuel(r.FuelTypePrimary, r.ElectrificationLevel);
  if (fuel) out.fuel = fuel;
  return out;
}
