import type { WorkingWindow } from "./types";

/**
 * Fallback weekly schedule until the admin working-hours editor lands
 * (PR 4). Tue – Sat 10:00 – 19:00, Sun/Mon closed.
 */
export const WEEKLY_DEFAULT_HOURS: WorkingWindow[] = [
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 6, startTime: "10:00", endTime: "19:00" },
];

export const DEFAULT_TIMEZONE = "Europe/Minsk";

export function bookingTimeZone(): string {
  return process.env.NEXT_PUBLIC_BOOKING_TIMEZONE ?? DEFAULT_TIMEZONE;
}
