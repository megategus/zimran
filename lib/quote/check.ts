import type { Car, LineVerdict, QuoteLine, QuoteVerdict, ServiceRecord } from '../types';
import type { Recall } from '../vehicle/recalls';
import { laborFor, type ScheduleRow } from '../seed';
import { fairRange } from '../pricing/fairRange';
import { upsellFlag } from '../schedule/upsell';
import { warrantyCoverage } from '../warranty/coverage';

export const DISCLAIMER = 'Estimates, not a guarantee. Not legal or mechanical advice.';

export class NoLinesError extends Error {
  constructor() { super("We couldn't read any prices, paste the text or try another photo"); }
}

export type CheckContext = { car: Car; history: ServiceRecord[]; recalls: Recall[]; today: Date; modelRows?: ScheduleRow[] };

// A repair that drains a system needs the matching fluid job, so that line is never an upsell.
const NEEDED_WITH: Record<string, string[]> = { coolant_flush: ['water_pump'] };

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

function verdictFor(line: QuoteLine, ctx: CheckContext, quoteJobs: Set<string | null>): LineVerdict {
  const { car, history, recalls, today, modelRows } = ctx;
  if (!line.jobKey) return { line, status: 'unknown', overpayCents: 0, reason: 'No benchmark for this line.' };
  const word = (laborFor(line.jobKey)?.label ?? line.jobKey.replace(/_/g, ' ')).toLowerCase();

  // Model-level recall data, so the copy always says "if your VIN is included".
  const recall = recalls.find((r) => `${r.component} ${r.summary}`.toLowerCase().includes(word));
  if (recall) return {
    line, status: 'recall', overpayCents: line.totalCents,
    reason: `Open recall ${recall.campaign} for this model (${recall.component}). Recall repairs are free at the dealer if your VIN is included.`,
    sayToShop: `Is this covered by recall ${recall.campaign}? Please check my VIN before I pay for it.`,
  };

  const w = warrantyCoverage(car, line.jobKey, today);
  if (w.status === 'likely') return {
    line, status: 'warranty', overpayCents: line.totalCents, reason: w.reason,
    sayToShop: 'This should be a warranty repair. Please file it as a warranty claim, or I will take it to the dealer.',
  };

  const range = fairRange(line.jobKey, car.state);
  const ranged = range ? { fairLowCents: range.lowCents, fairHighCents: range.highCents } : {};

  const neededFor = NEEDED_WITH[line.jobKey]?.find((k) => quoteJobs.has(k));
  const up = neededFor ? null : upsellFlag(line.jobKey, car, history, today, modelRows);
  if (up?.isUpsell) return {
    line, status: 'upsell', overpayCents: line.totalCents, ...ranged, reason: up.reason,
    sayToShop: `My maker's schedule doesn't call for the ${word} yet. Please take it off the quote.`,
  };

  if (!range) return { line, status: 'unknown', overpayCents: 0, reason: `No price benchmark for ${word} in ${car.state}.` };
  if (line.totalCents > range.highCents) return {
    line, status: 'high', overpayCents: line.totalCents - range.highCents, ...ranged,
    reason: `${usd(line.totalCents)} is above the fair range ${usd(range.lowCents)}–${usd(range.highCents)} (${range.basis}).`,
    sayToShop: `The usual price for the ${word} here is ${usd(range.lowCents)}–${usd(range.highCents)}. Can you match ${usd(range.highCents)}?`,
  };
  const need = neededFor ? `Needed with the ${(laborFor(neededFor)?.label ?? neededFor).toLowerCase()} on this quote. ` : '';
  return { line, status: 'fair', overpayCents: 0, ...ranged, reason: `${need}Within the fair range ${usd(range.lowCents)}–${usd(range.highCents)}.` };
}

/** Per-line verdicts and total likely overpay. Pure: same input, same verdict. */
export function checkQuote(lines: QuoteLine[], ctx: CheckContext): QuoteVerdict {
  if (!lines.length) throw new NoLinesError();
  const jobs = new Set(lines.map((l) => l.jobKey));
  const verdicts = lines.map((l) => verdictFor(l, ctx, jobs));
  return {
    lines: verdicts,
    totalCents: lines.reduce((s, l) => s + l.totalCents, 0),
    overpayCents: verdicts.reduce((s, v) => s + v.overpayCents, 0),
    flaggedCount: verdicts.filter((v) => v.status !== 'fair' && v.status !== 'unknown').length,
    disclaimer: DISCLAIMER,
  };
}
