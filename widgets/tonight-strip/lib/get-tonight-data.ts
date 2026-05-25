import { getLocale } from "next-intl/server";
import { computeAvailableSlots } from "@/shared/lib/google-calendar/slots";
import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZoneFallback,
} from "@/shared/lib/google-calendar/working-hours";
import { getNextOpening } from "@/shared/lib/atelier/next-opening";
import type { WorkingWindow } from "@/shared/lib/google-calendar/types";
import type { TonightStripData } from "../ui/tonight-strip-client";

interface BuildOptions {
  workingHours?: WorkingWindow[];
  serviceLabel?: string;
  now?: Date;
}

/**
 * Builds the data shape the TonightStripClient needs from working hours +
 * an optional service label. Pure — does no DB I/O. Caller can override
 * `now` for tests.
 */
export function buildTonightStripData(
  options: BuildOptions = {},
): TonightStripData | null {
  const now = options.now ?? new Date();
  const hours = options.workingHours ?? WEEKLY_DEFAULT_HOURS;
  const tz = bookingTimeZoneFallback();
  const todayISO = isoDateInTZ(now, tz);

  const todaySlots = computeAvailableSlots({
    workingHours: hours,
    busy: [],
    serviceDurationMin: 60,
    dayISO: todayISO,
    timeZone: tz,
    granularityMin: 60,
    now,
    minLeadMinutes: 60,
  });

  if (todaySlots.length > 0) {
    return {
      isToday: true,
      time: todaySlots[0],
      service: options.serviceLabel ?? null,
      laterSlots: todaySlots.slice(1).map((time) => ({
        time,
        service: options.serviceLabel ?? null,
      })),
    };
  }

  const next = getNextOpening({
    workingHours: hours,
    timeZone: tz,
    now,
    serviceLabel: options.serviceLabel,
  });
  if (!next) return null;
  return {
    isToday: false,
    time: next.time,
    service: next.serviceLabel ?? null,
    next: {
      dayName: "", // resolved in the server component (locale-dependent).
      time: next.time,
      service: next.serviceLabel ?? null,
    },
  };
}

/** Resolves a locale-aware short day label for the supplied YYYY-MM-DD. */
export async function localizedDayName(
  isoDate: string,
): Promise<string> {
  const locale = await getLocale();
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
