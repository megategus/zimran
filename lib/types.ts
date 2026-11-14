// Shared contracts between lib/, app/api/ and the UI. Money is integer cents.

export type Drivetrain = 'fwd' | 'rwd' | 'awd' | '4wd';
export type Fuel = 'gas' | 'diesel' | 'hybrid' | 'ev';

export type Car = {
  id: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  drivetrain?: Drivetrain;
  fuel?: Fuel;
  state: string; // 2-letter US state
  mileage: number;
  originalOwner: boolean;
  purchaseDate?: string; // ISO date
};

export type QuoteLine = {
  raw: string;
  jobKey: string | null; // null = no benchmark for this line
  laborHours?: number;
  partsCents?: number;
  totalCents: number;
};

export type LineStatus = 'fair' | 'high' | 'upsell' | 'warranty' | 'recall' | 'unknown';

export type LineVerdict = {
  line: QuoteLine;
  status: LineStatus;
  fairLowCents?: number;
  fairHighCents?: number;
  overpayCents: number;
  reason: string;
  sayToShop?: string;
};

export type QuoteVerdict = {
  lines: LineVerdict[];
  totalCents: number;
  overpayCents: number;
  flaggedCount: number;
  disclaimer: string;
};

export type DueService = {
  jobKey: string;
  label: string;
  dueMiles?: number;
  dueDate?: string; // ISO date
  overdue: boolean;
  source: string;
};

export type ServiceRecord = {
  id: string;
  assetType: 'car';
  assetId: string;
  serviceDate: string; // ISO date
  mileage: number;
  source: 'manual' | 'voice' | 'quote' | 'import';
  shop?: string;
  lines: { jobKey: string | null; label: string; totalCents: number }[];
  totalCents: number;
};

export type Plan = 'free' | 'plus';
