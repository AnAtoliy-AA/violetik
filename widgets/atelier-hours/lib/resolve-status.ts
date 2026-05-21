import type { WorkingWindow, DayOfWeek } from "@/shared/lib/google-calendar";

export type AtelierStatus =
  | { state: "open"; closesAt: string }
  | { state: "closed"; opensAt: { dayOfWeek: DayOfWeek; time: string } }
  | { state: "no-hours" };

/** Minutes since midnight from a `HH:mm` string. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Resolves whether the atelier is open right now, or when it opens next.
 *
 * Pure: takes the working windows + a `now` Date and returns the status.
 * The day-of-week is read from `now` in the calling time zone — the caller
 * controls how `now` is constructed.
 */
export function resolveAtelierStatus(
  windows: readonly WorkingWindow[],
  now: Date = new Date(),
): AtelierStatus {
  if (windows.length === 0) return { state: "no-hours" };

  const dow = now.getDay() as DayOfWeek;
  const minutes = now.getHours() * 60 + now.getMinutes();

  const today = windows.find((w) => w.dayOfWeek === dow);
  if (today) {
    const start = toMinutes(today.startTime);
    const end = toMinutes(today.endTime);
    if (minutes >= start && minutes < end) {
      return { state: "open", closesAt: today.endTime };
    }
    if (minutes < start) {
      return {
        state: "closed",
        opensAt: { dayOfWeek: dow, time: today.startTime },
      };
    }
  }

  // Find the next opening across the upcoming 7 days.
  for (let offset = 1; offset <= 7; offset += 1) {
    const targetDow = ((dow + offset) % 7) as DayOfWeek;
    const win = windows.find((w) => w.dayOfWeek === targetDow);
    if (win) {
      return {
        state: "closed",
        opensAt: { dayOfWeek: targetDow, time: win.startTime },
      };
    }
  }
  return { state: "no-hours" };
}
