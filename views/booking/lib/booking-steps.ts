// §6.1 — Phase 2 collapses date + time into a single "when" step, and
// hides the "master" step when the studio has a single master.
// `BOOKING_STEPS` keeps the legacy long form so existing /booking/date
// and /booking/time URLs (deep-links, marketing emails, the Welcome
// tonight ribbon) still resolve. `effectiveBookingSteps()` is what the
// UI walks — it returns the three- or four-step list depending on
// `mastersCount`.
export const BOOKING_STEPS = [
  "service",
  "master",
  "date",
  "time",
  "when",
  "confirm",
] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];

export function isBookingStep(value: string): value is BookingStep {
  return (BOOKING_STEPS as readonly string[]).includes(value);
}

/**
 * Step list the stepper + advance/back logic walk. With a solo studio
 * the master step is omitted; with multiple masters it is reintroduced
 * automatically. /booking/date and /booking/time remain reachable for
 * backwards compatibility but the in-app flow routes through /when.
 */
export function effectiveBookingSteps(
  mastersCount: number,
): ReadonlyArray<BookingStep> {
  const base: BookingStep[] = ["service"];
  if (mastersCount > 1) base.push("master");
  base.push("when", "confirm");
  return base;
}

export function indexOfStep(
  step: BookingStep,
  steps: ReadonlyArray<BookingStep> = BOOKING_STEPS,
): number {
  // Treat legacy /date or /time as the collapsed /when step so an
  // emailed link still lights up the stepper correctly.
  if (step === "date" || step === "time") {
    const whenIdx = steps.indexOf("when");
    if (whenIdx !== -1) return whenIdx;
  }
  return steps.indexOf(step);
}

export function nextStep(
  step: BookingStep,
  steps: ReadonlyArray<BookingStep> = BOOKING_STEPS,
): BookingStep | null {
  const i = indexOfStep(step, steps);
  if (i === -1 || i === steps.length - 1) return null;
  return steps[i + 1];
}

export function prevStep(
  step: BookingStep,
  steps: ReadonlyArray<BookingStep> = BOOKING_STEPS,
): BookingStep | null {
  const i = indexOfStep(step, steps);
  if (i <= 0) return null;
  return steps[i - 1];
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
export function bookingStartISO(now: Date, tz: string): string {
  // Param is `tz` (not `timeZone`) so SWC's inliner doesn't lose the
  // value through a `{ timeZone }` shorthand when inlining this fn into
  // a scope that shadows the param's renamed identifier. See the same
  // workaround in `dayOfWeekInTZ` below.
  // en-CA always formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
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

function dayOfWeekInTZ(iso: string, tz: string): number {
  // Param is `tz` (not `timeZone`) on purpose: when SWC inlines this
  // fn into the Array.from callback below, the callback's index param
  // shadows the outer `timeZone`. A `{ timeZone }` shorthand here gets
  // left as a free reference after inlining → ReferenceError at
  // runtime. Using a different name forces the inliner to emit an
  // explicit `timeZone: tz` it can rewrite correctly.
  // 12:00 UTC sits ~11h from either DST transition edge in any
  // real-world studio tz, so the studio-local civil date is invariant.
  const anchor = new Date(`${iso}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
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
