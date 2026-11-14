import type { Car, DueService } from '../types';

const ymd = (iso: string) => iso.replace(/-/g, '').slice(0, 8);
// RFC 5545 text escaping.
const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** iCalendar file with one all-day event per due item that has a date. */
export function toIcs(car: Car, items: DueService[], now = new Date()): string {
  const name = `${car.year} ${car.make} ${car.model}`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events = items.filter((d) => d.dueDate).flatMap((d) => [
    'BEGIN:VEVENT',
    `UID:${car.id}-${d.jobKey}@counter-check`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(d.dueDate!)}`,
    `SUMMARY:${esc(`${d.label} - ${name}`)}`,
    `DESCRIPTION:${esc(`${d.overdue ? 'Overdue. ' : ''}${d.dueMiles ? `Or at ${d.dueMiles.toLocaleString('en-US')} mi. ` : ''}${d.source}`)}`,
    'END:VEVENT',
  ]);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Counter Check//Maintenance plan//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}
