import { z } from 'zod';
import type { Car } from '../types';

// Trust boundary: everything a client sends about a car goes through this schema.
export const carInput = z.object({
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i).optional(),
  year: z.number().int().min(1981).max(new Date().getFullYear() + 1),
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(60),
  trim: z.string().trim().max(60).optional(),
  drivetrain: z.enum(['fwd', 'rwd', 'awd', '4wd']).optional(),
  fuel: z.enum(['gas', 'diesel', 'hybrid', 'ev']).optional(),
  state: z.string().length(2).transform((s) => s.toUpperCase()),
  mileage: z.number().int().min(0).max(1_000_000),
  originalOwner: z.boolean(),
  purchaseDate: z.string().date().optional(),
});
export type CarInput = z.infer<typeof carInput>;

type Row = Record<string, any>;

export const toRow = (c: Partial<CarInput>): Row => {
  const row: Row = {
    vin: c.vin?.toUpperCase(), year: c.year, make: c.make, model: c.model, trim: c.trim,
    drivetrain: c.drivetrain, fuel: c.fuel, state: c.state, mileage: c.mileage,
    original_owner: c.originalOwner, purchase_date: c.purchaseDate,
  };
  for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
  return row;
};

export const fromRow = (r: Row): Car & { isSample?: boolean } => ({
  id: r.id, vin: r.vin ?? undefined, year: r.year, make: r.make, model: r.model, trim: r.trim ?? undefined,
  drivetrain: r.drivetrain ?? undefined, fuel: r.fuel ?? undefined, state: r.state, mileage: r.mileage,
  originalOwner: r.original_owner, purchaseDate: r.purchase_date ?? undefined,
  ...(r.is_sample ? { isSample: true } : {}),
});
