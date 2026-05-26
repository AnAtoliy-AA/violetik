import { cache } from "react";
import { computeAvailableSlots } from "@/shared/lib/google-calendar/slots";
import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZoneFallback,
} from "@/shared/lib/google-calendar/working-hours";
import type {
  BusyWindow,
  WorkingWindow,
} from "@/shared/lib/google-calendar/types";

export interface NextOpening {
  /** ISO date YYYY-MM-DD in the studio timezone. */
  date: string;
  /** Local time "HH:MM" of the opening. */
  time: string;
  /** True if `date` is today in the studio timezone. */
  isToday: boolean;
  /** Optional service hint — caller decides what gets pre-filled. */
  serviceLabel?: string;
}

export interface GetNextOpeningOptions {
  workingHours?: WorkingWindow[];
  busy?: BusyWindow[];
  timeZone?: string;
  /** Service duration to fit. Defaults to 60min — small enough to find slots. */
  durationMin?: number;
  /** Suggested service label to surface alongside the slot. */
  serviceLabel?: string;
  /** Override of "now". Default: `new Date()`. */
  now?: Date;
  /** Look ahead at most this many days. Default 14. */
  horizonDays?: number;
  /** Minimum lead time in minutes for *today*'s slots. Default 60. */
  minLeadMinutes?: number;
  /** Slot granularity in minutes. Default 30. */
  granularityMin?: number;
}

/**
 * Pure resolver for the studio's next bookable opening. Walks the
 * working-hours calendar forward from `now`, returning the earliest
 * slot that fits a `durationMin` service. The result is intentionally
 * cheap: it does *not* hit the database — callers that have richer
 * availability data (booking conflicts, Google free/busy) should pass
 * `busy` windows in.
 *
 * Wrapped in React's `cache()` so multiple components in one server
 * render share a single computation. Pass a real `now` from tests to
 * avoid clock flake.
 *
 * TODO(next-wave-data): integrate the bookings table once a fast
 * "upcoming bookings in next 14 days" query is in place.
 */
function compute(opts: GetNextOpeningOptions = {}): NextOpening | null {
  const now = opts.now ?? new Date();
  const tz = opts.timeZone ?? bookingTimeZoneFallback();
  const hours = opts.workingHours ?? WEEKLY_DEFAULT_HOURS;
  const horizon = opts.horizonDays ?? 14;
  const minLead = opts.minLeadMinutes ?? 60;
  const duration = opts.durationMin ?? 60;
  const granularity = opts.granularityMin ?? 30;
  const busy = opts.busy ?? [];
  if (hours.length === 0) return null;

  const todayIso = isoDateInTZ(now, tz);
  for (let i = 0; i < horizon; i++) {
    const candidateDate = addDays(now, i);
    const dayISO = isoDateInTZ(candidateDate, tz);
    const slots = computeAvailableSlots({
      workingHours: hours,
      busy,
      serviceDurationMin: duration,
      dayISO,
      timeZone: tz,
      granularityMin: granularity,
      now,
      minLeadMinutes: i === 0 ? minLead : 0,
    });
    if (slots.length > 0) {
      return {
        date: dayISO,
        time: slots[0],
        isToday: dayISO === todayIso,
        serviceLabel: opts.serviceLabel,
      };
    }
  }
  return null;
}

export const getNextOpening = cache(compute);

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
