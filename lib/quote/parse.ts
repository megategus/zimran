import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { QuoteLine } from '../types';
import { labor } from '../seed';
import { PARSE_MODEL, anthropic } from '../ai/client';

const Parsed = z.object({
  lines: z.array(z.object({
    raw: z.string(),
    job_key: z.string().nullable(),
    labor_hours: z.number().nullable(),
    parts_cents: z.number().int().nullable(),
    total_cents: z.number().int(),
  })),
});

export class QuoteParseError extends Error {}

const SYSTEM = `You read US auto repair shop quotes and invoices into line items. You only extract, never judge prices.
Rules:
- One entry per priced service line. Skip tax, subtotal, total and payment lines.
- raw: the line text as written.
- job_key: one key from the allowed list when the line clearly is that job (use the aliases); otherwise null. Never invent a key.
- total_cents: the line's total price in cents. labor_hours and parts_cents only when the quote states them, else null.
- If you cannot read any prices, return an empty lines array.
Allowed job keys (key: label; aliases):
${labor.map((l) => `${l.job_key}: ${l.label}; ${l.aliases.join(', ')}`).join('\n')}`;

/** Messy quote (text or photo) → typed lines. Claude only extracts; all verdicts come from our code. */
export async function parseQuote(
  input: { text?: string; imageBase64?: string; mediaType?: string },
  client: Pick<Anthropic, 'messages'> = anthropic(),
): Promise<QuoteLine[]> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.imageBase64)
    content.push({ type: 'image', source: { type: 'base64', media_type: (input.mediaType ?? 'image/jpeg') as 'image/jpeg', data: input.imageBase64 } });
  content.push({ type: 'text', text: input.text?.trim() ? `Quote text:\n${input.text}` : 'Read the quote in the photo.' });

  const keys = new Set(labor.map((l) => l.job_key));
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.parse({
      model: PARSE_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
      output_config: { format: zodOutputFormat(Parsed) },
    });
    const out = res.parsed_output;
    if (!out) continue; // malformed output: retry once
    return out.lines
      .filter((l) => l.total_cents >= 0)
      .map((l) => {
        const line: QuoteLine = { raw: l.raw, jobKey: l.job_key && keys.has(l.job_key) ? l.job_key : null, totalCents: l.total_cents };
        if (l.labor_hours != null) line.laborHours = l.labor_hours;
        if (l.parts_cents != null) line.partsCents = l.parts_cents;
        return line;
      });
  }
  throw new QuoteParseError('Could not parse the quote');
}
