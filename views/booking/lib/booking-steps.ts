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

export const BOOKING_START_ISO = "2026-05-19";

export interface DateCell {
  iso: string;
  day: number;
  dow: string;
  disabled: boolean;
}

export function buildDateStrip(locale: string): DateCell[] {
  const start = new Date(`${BOOKING_START_ISO}T00:00:00Z`);
  const dowFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon
    return {
      iso: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      dow: dowFmt.format(d),
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
