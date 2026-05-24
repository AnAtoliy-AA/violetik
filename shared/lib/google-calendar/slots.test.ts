import { describe, it, expect } from "vitest";
import { computeAvailableSlots } from "./slots";
import type { BusyWindow, WorkingWindow } from "./types";

const MINSK_TUE_10_TO_19: WorkingWindow[] = [
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
];

function busy(startISO: string, endISO: string): BusyWindow {
  return { start: new Date(startISO), end: new Date(endISO) };
}

describe("computeAvailableSlots", () => {
  it("returns every 30-min start that fits a 60-min service inside 10:00-19:00", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    expect(slots[0]).toBe("10:00");
    expect(slots.at(-1)).toBe("18:00");
    expect(slots).toHaveLength(17);
  });

  it("drops slots that overlap a busy window", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [busy("2026-05-19T10:00:00+03:00", "2026-05-19T11:00:00+03:00")],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
  });

  it("keeps slots whose start exactly equals a busy window's end", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [busy("2026-05-19T10:00:00+03:00", "2026-05-19T11:00:00+03:00")],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    expect(slots).toContain("11:00");
  });

  it("drops trailing slots that don't fit before the window closes", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 150,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    expect(slots.at(-1)).toBe("16:30");
  });

  it("returns [] for a day with no working window (Sunday)", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 60,
      dayISO: "2026-05-17",
      timeZone: "Europe/Minsk",
    });
    expect(slots).toEqual([]);
  });

  it("handles a DST-observing timezone (Europe/London)", () => {
    const londonHours: WorkingWindow[] = [
      { dayOfWeek: 0, startTime: "00:30", endTime: "04:00" },
    ];
    const slots = computeAvailableSlots({
      workingHours: londonHours,
      busy: [],
      serviceDurationMin: 30,
      dayISO: "2026-03-29",
      timeZone: "Europe/London",
    });
    expect(slots[0]).toBe("00:30");
    expect(slots).toContain("03:00");
  });

  it("drops slots that start within minLeadMinutes of `now`", () => {
    // 2026-05-19 (Tue) 11:00 Europe/Minsk = 08:00 UTC
    const now = new Date("2026-05-19T08:00:00Z");
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
      now,
      minLeadMinutes: 180,
    });
    // Cutoff = 14:00 Europe/Minsk. Slots earlier than 14:00 are dropped;
    // 14:00 itself sits exactly at the boundary and is kept.
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("13:30");
    expect(slots).toContain("14:00");
    expect(slots).toContain("17:00");
  });

  it("does not filter when `now` is omitted (backwards compatible)", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
      minLeadMinutes: 180, // ignored without `now`
    });
    expect(slots[0]).toBe("10:00");
  });
});
