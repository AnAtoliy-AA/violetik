import { computeAvailableSlots } from "@/shared/lib/google-calendar/slots";
import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZoneFallback,
} from "@/shared/lib/google-calendar/working-hours";
import type {
  BusyWindow,
  WorkingWindow,
} from "@/shared/lib/google-calendar/types";

/** One bookable opening within the today/tomorrow window. */
export interface TonightStripSlot {
  /** Local "HH:MM" start time. */
  time: string;
  /** Studio-timezone date YYYY-MM-DD this slot belongs to. */
  dateISO: string;
  /** True when `dateISO` is today in the studio timezone. */
  isToday: boolean;
}

/** Pure builder output — locale-agnostic; day labels resolved downstream. */
export interface TonightAvailability {
  slots: TonightStripSlot[];
}

interface BuildOptions {
  workingHours?: WorkingWindow[];
  now?: Date;
  /**
   * Busy windows (DB bookings + Google Calendar free/busy) that block
   * slots. Defaults to none — callers with real availability data pass
   * them so the strip only advertises genuinely-open times.
   */
  busy?: BusyWindow[];
}

/**
 * Builds the data the TonightStripClient needs: the studio's available
 * openings for *today and tomorrow only*, in order. Pure — does no DB I/O.
 * Caller can override `now` for tests.
 *
 * Today's slots respect a 60min booking lead; tomorrow's are the full day.
 * Returns `null` only when no working hours are configured at all; an
 * empty `slots` array means both days are fully booked (the client shows
 * a "no openings today or tomorrow" line). Day labels are locale-aware and
 * resolved by the server component, not here.
 */
export function buildTonightStripData(
  options: BuildOptions = {},
): TonightAvailability | null {
  const now = options.now ?? new Date();
  const hours = options.workingHours ?? WEEKLY_DEFAULT_HOURS;
  if (hours.length === 0) return null;

  const busy = options.busy ?? [];
  const tz = bookingTimeZoneFallback();
  const todayISO = isoDateInTZ(now, tz);
  const tomorrowISO = isoDateInTZ(addDays(now, 1), tz);

  const todaySlots = computeAvailableSlots({
    workingHours: hours,
    busy,
    serviceDurationMin: 60,
    dayISO: todayISO,
    timeZone: tz,
    granularityMin: 60,
    now,
    minLeadMinutes: 60,
  });
  const tomorrowSlots = computeAvailableSlots({
    workingHours: hours,
    busy,
    serviceDurationMin: 60,
    dayISO: tomorrowISO,
    timeZone: tz,
    granularityMin: 60,
    now,
    minLeadMinutes: 0,
  });

  const slots = [
    ...todaySlots.map((time) => ({
      time,
      dateISO: todayISO,
      isToday: true,
    })),
    ...tomorrowSlots.map((time) => ({
      time,
      dateISO: tomorrowISO,
      isToday: false,
    })),
  ];

  return { slots };
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
