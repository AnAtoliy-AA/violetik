export const BOOKING_STEPS = [
  "service",
  "master",
  "date",
  "time",
  "confirm",
] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];

export function isBookingStep(value: string): value is BookingStep {
  return (BOOKING_STEPS as readonly string[]).includes(value);
}

export function indexOfStep(step: BookingStep): number {
  return BOOKING_STEPS.indexOf(step);
}

export function nextStep(step: BookingStep): BookingStep | null {
  const i = indexOfStep(step);
  if (i === -1 || i === BOOKING_STEPS.length - 1) return null;
  return BOOKING_STEPS[i + 1];
}

export function prevStep(step: BookingStep): BookingStep | null {
  const i = indexOfStep(step);
  if (i <= 0) return null;
  return BOOKING_STEPS[i - 1];
}

export const RESERVED_TIMES = ["11:30", "16:00"] as const;
export const BOOKING_TIMES = [
  "10:00",
  "11:30",
  "13:00",
  "14:30",
  "16:00",
  "17:30",
  "19:00",
] as const;

export const MIN_BOOKING_LEAD_MINUTES = 180;

export interface DateCell {
  iso: string;
  day: number;
  dow: string;
  disabled: boolean;
}

/**
 * Today's civil date (YYYY-MM-DD) in the given timezone. Used as the
 * first cell of the booking date strip — never UTC, because the
 * studio's "today" can differ from UTC by ±3h.
 */
export function bookingStartISO(now: Date, timeZone: string): string {
  // en-CA always formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const DOW_FROM_EN = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
} as const;

function dayOfWeekInTZ(iso: string, timeZone: string): number {
  // 12:00 UTC anchor avoids DST edges.
  const anchor = new Date(`${iso}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(anchor);
  return DOW_FROM_EN[wd as keyof typeof DOW_FROM_EN];
}

function addCivilDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildDateStrip(
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): DateCell[] {
  const start = bookingStartISO(now, timeZone);
  const dowFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 14 }, (_, i) => {
    const iso = addCivilDays(start, i);
    const dayOfWeek = dayOfWeekInTZ(iso, timeZone);
    const dayNum = Number.parseInt(iso.slice(8, 10), 10);
    return {
      iso,
      day: dayNum,
      dow: dowFmt.format(new Date(`${iso}T12:00:00Z`)),
      disabled: dayOfWeek === 0 || dayOfWeek === 1,
    };
  });
}

export function formatLongDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatMonthYear(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
