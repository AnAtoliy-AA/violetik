/**
 * Vanilla iCalendar (RFC 5545) builder. Used by the booking ICS
 * download endpoint + the "Add to calendar" chips on the confirmation
 * page. Kept dependency-free so the API route stays cold-start cheap.
 *
 * Caveats:
 * - Folds long lines at 75 octets per the spec.
 * - Times are emitted as UTC (`Z` suffix) — we already store
 *   `scheduledFor` as `timestamp with time zone`, so toISOString()
 *   gives the right instant regardless of server timezone.
 * - Reserved characters in TEXT-typed fields (\\, ;, ,, newline) are
 *   escaped per §3.3.11.
 */

export interface CalendarEventInput {
  /** Stable, globally unique event id. Use the booking id. */
  uid: string;
  start: Date;
  /** Inclusive duration in minutes. */
  durationMinutes: number;
  /** Short event title. */
  summary: string;
  /** Optional long-form notes shown in the calendar entry. */
  description?: string;
  /** Free-form location string. */
  location?: string;
  /** Caller domain — used for the PRODID identifier. */
  prodId?: string;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsTimestamp(d: Date): string {
  // YYYYMMDDTHHMMSSZ — UTC, no separators.
  const iso = d.toISOString();
  return iso
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
    .replace(/T(\d{6})Z$/, "T$1Z");
}

function foldLine(line: string): string {
  // RFC 5545 §3.1: split lines longer than 75 octets, continuation
  // lines start with a single whitespace character.
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  out.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    out.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return out.join("\r\n");
}

export function buildIcsEvent({
  uid,
  start,
  durationMinutes,
  summary,
  description,
  location,
  prodId = "-//Violetta Atelier//Booking//EN",
}: CalendarEventInput): string {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const dtStamp = toIcsTimestamp(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${toIcsTimestamp(start)}`,
    `DTEND:${toIcsTimestamp(end)}`,
    `SUMMARY:${escapeText(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
