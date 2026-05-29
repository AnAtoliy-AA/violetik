import { describe, it, expect } from "vitest";
import { buildTonightStripData } from "./get-tonight-data";
import type {
  BusyWindow,
  WorkingWindow,
} from "@/shared/lib/google-calendar/types";

const HOURS: WorkingWindow[] = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
];

describe("buildTonightStripData", () => {
  it("returns today's remaining slots followed by tomorrow's slots", () => {
    // Monday 2026-05-25 10:00Z → 13:00 Minsk (UTC+3). With a 60min lead,
    // today's first bookable slot is 14:00.
    const data = buildTonightStripData({
      workingHours: HOURS,
      now: new Date("2026-05-25T10:00:00Z"),
    });
    expect(data).not.toBeNull();
    const slots = data!.slots;

    const today = slots.filter((s) => s.isToday);
    const tomorrow = slots.filter((s) => !s.isToday);

    // Today: 14:00–18:00 hourly.
    expect(today.map((s) => s.time)).toEqual([
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ]);
    expect(today.every((s) => s.dateISO === "2026-05-25")).toBe(true);

    // Tomorrow (Tue): full day 10:00–18:00.
    expect(tomorrow[0]?.time).toBe("10:00");
    expect(tomorrow.every((s) => s.dateISO === "2026-05-26")).toBe(true);
    expect(tomorrow.length).toBeGreaterThan(today.length);

    // Order: every today slot precedes every tomorrow slot.
    const firstTomorrowIdx = slots.findIndex((s) => !s.isToday);
    expect(slots.slice(0, firstTomorrowIdx).every((s) => s.isToday)).toBe(true);
  });

  it("shows only tomorrow's slots once today is over", () => {
    // Monday 2026-05-25 20:00Z → 23:00 local, past the last 18:00 start.
    const data = buildTonightStripData({
      workingHours: HOURS,
      now: new Date("2026-05-25T20:00:00Z"),
    });
    expect(data).not.toBeNull();
    expect(data!.slots.length).toBeGreaterThan(0);
    expect(data!.slots.every((s) => !s.isToday)).toBe(true);
    expect(data!.slots.every((s) => s.dateISO === "2026-05-26")).toBe(true);
  });

  it("returns an empty slot list when neither today nor tomorrow is open", () => {
    // Saturday 2026-05-30 → Sat + Sun, neither in the Mon–Fri schedule.
    const data = buildTonightStripData({
      workingHours: HOURS,
      now: new Date("2026-05-30T09:00:00Z"),
    });
    expect(data).not.toBeNull();
    expect(data!.slots).toEqual([]);
  });

  it("returns null when no working hours are configured", () => {
    expect(buildTonightStripData({ workingHours: [] })).toBeNull();
  });

  it("drops slots that overlap a busy window", () => {
    // Monday 2026-05-25 10:00Z. Today's slots are 14:00–18:00 Minsk.
    // 15:00 Minsk (UTC+3) == 12:00Z; a 12:00–13:00Z busy window must
    // remove the 15:00 opening while leaving 14:00 and 16:00 intact.
    const busy: BusyWindow[] = [
      {
        start: new Date("2026-05-25T12:00:00Z"),
        end: new Date("2026-05-25T13:00:00Z"),
      },
    ];
    const data = buildTonightStripData({
      workingHours: HOURS,
      now: new Date("2026-05-25T10:00:00Z"),
      busy,
    });
    expect(data).not.toBeNull();
    const today = data!.slots.filter((s) => s.isToday).map((s) => s.time);
    expect(today).not.toContain("15:00");
    expect(today).toContain("14:00");
    expect(today).toContain("16:00");
  });
});
