import type { SiteSettings } from "@/entities/site-settings";
import type { WorkingWindow } from "./types";

export const WEEKLY_DEFAULT_HOURS: WorkingWindow[] = [
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 6, startTime: "10:00", endTime: "19:00" },
];

export const DEFAULT_TIMEZONE = "Europe/Minsk";

/**
 * Returns the studio timezone from saved settings. Use this when you
 * already have settings in scope — every server context that talks to
 * the booking flow loads them anyway.
 */
export function bookingTimeZoneFromSettings(settings: SiteSettings): string {
  return settings.timezone || DEFAULT_TIMEZONE;
}

/**
 * Returns the timezone from environment / hardcoded default. Use only
 * when settings are not (and cannot be) loaded — e.g. unit fixtures
 * or build-time SSG paths without DB access.
 */
export function bookingTimeZoneFallback(): string {
  return process.env.NEXT_PUBLIC_BOOKING_TIMEZONE ?? DEFAULT_TIMEZONE;
}

/** @deprecated use `bookingTimeZoneFromSettings` or `bookingTimeZoneFallback`. */
export function bookingTimeZone(): string {
  return bookingTimeZoneFallback();
}
