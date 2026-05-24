import type {
  BusyWindow,
  DayOfWeek,
  SlotComputationInput,
} from "./types";

/**
 * Pure slot derivation. Given the studio's recurring working hours and
 * the set of Google Calendar busy windows for the day, returns the
 * local "HH:MM" start times of slots where a service of
 * `serviceDurationMin` fits without overlapping any busy window.
 *
 * Timezone arithmetic is done via Intl.DateTimeFormat with the
 * "longOffset" formatter so the algorithm works in DST-observing
 * zones without depending on the host TZ.
 */
export function computeAvailableSlots(input: SlotComputationInput): string[] {
  const granularity = input.granularityMin ?? 30;
  const dow = dayOfWeekInTZ(input.dayISO, input.timeZone);
  const windows = input.workingHours.filter((w) => w.dayOfWeek === dow);
  if (windows.length === 0) return [];

  const slots: string[] = [];
  for (const w of windows) {
    const windowStartMin = toMinutes(w.startTime);
    const windowEndMin = toMinutes(w.endTime);
    const lastStartMin = windowEndMin - input.serviceDurationMin;

    for (let t = windowStartMin; t <= lastStartMin; t += granularity) {
      const slotStart = localTimeToUtc(input.dayISO, formatHM(t), input.timeZone);
      const slotEnd = new Date(
        slotStart.getTime() + input.serviceDurationMin * 60_000,
      );
      if (intersectsAny(slotStart, slotEnd, input.busy)) continue;
      if (isBeforeLead(slotStart, input.now, input.minLeadMinutes)) continue;
      slots.push(formatHM(t));
    }
  }
  return slots;
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((x) => Number.parseInt(x, 10));
  return h * 60 + m;
}

function formatHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function intersectsAny(start: Date, end: Date, busy: BusyWindow[]): boolean {
  return busy.some((b) => start < b.end && b.start < end);
}

function dayOfWeekInTZ(dayISO: string, timeZone: string): DayOfWeek {
  const anchor = new Date(`${dayISO}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(anchor);
  const map: Record<string, DayOfWeek> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[wd];
}

function localTimeToUtc(
  dayISO: string,
  hm: string,
  timeZone: string,
): Date {
  const [hStr, mStr] = hm.split(":");
  const h = Number.parseInt(hStr!, 10);
  const m = Number.parseInt(mStr!, 10);
  const naive = new Date(
    `${dayISO}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`,
  );
  const tzOffsetMs = getTimeZoneOffsetMs(naive, timeZone);
  return new Date(naive.getTime() - tzOffsetMs);
}

function isBeforeLead(
  slotStart: Date,
  now: Date | undefined,
  minLeadMinutes: number | undefined,
): boolean {
  if (!now || minLeadMinutes === undefined) return false;
  return slotStart.getTime() - now.getTime() < minLeadMinutes * 60_000;
}

function getTimeZoneOffsetMs(at: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(at);
  const tzPart =
    parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(tzPart);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const h = Number.parseInt(match[2]!, 10);
  const mm = Number.parseInt(match[3]!, 10);
  return sign * (h * 60 + mm) * 60_000;
}
