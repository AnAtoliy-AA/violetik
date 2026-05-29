import { bookingTimeZoneFallback } from "@/shared/lib/google-calendar/working-hours";

/** One candidate day (today / tomorrow) the strip queries for openings. */
export interface TonightCandidateDay {
  /** Studio-timezone date YYYY-MM-DD. */
  dateISO: string;
  /** True when `dateISO` is today in the studio timezone. */
  isToday: boolean;
}

/**
 * The two days the tonight ribbon advertises — today and tomorrow in the
 * studio timezone. Pure + cheap; the client then asks the live
 * `/api/booking/slots` endpoint (the same source the booking flow uses)
 * which of these days' times are genuinely open, so the strip can never
 * drift from the booking grid.
 */
export function tonightCandidateDays(
  now: Date = new Date(),
  tz: string = bookingTimeZoneFallback(),
): TonightCandidateDay[] {
  const todayISO = isoDateInTZ(now, tz);
  const tomorrowISO = isoDateInTZ(addDays(now, 1), tz);
  return [
    { dateISO: todayISO, isToday: true },
    { dateISO: tomorrowISO, isToday: false },
  ];
}

/** Synchronous short weekday label (uppercased) for a YYYY-MM-DD date. */
export function weekdayLabel(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: "short" })
    .format(new Date(y, m - 1, d))
    .toUpperCase();
}

function isoDateInTZ(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
