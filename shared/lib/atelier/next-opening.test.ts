import { describe, it, expect } from "vitest";
import { getNextOpening } from "./next-opening";
import type { WorkingWindow } from "@/shared/lib/google-calendar/types";

const TZ = "Europe/Minsk";

const HOURS_MON_TO_FRI: WorkingWindow[] = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
];

describe("getNextOpening", () => {
  it("returns the next slot today when there's room", () => {
    // Monday 2026-05-25 12:00 local. Studio opens 10-19; next 30-min slot
    // with 60min duration + 60min lead is 13:00.
    const now = new Date("2026-05-25T09:00:00Z"); // 12:00 Minsk in May (UTC+3)
    const next = getNextOpening({
      workingHours: HOURS_MON_TO_FRI,
      timeZone: TZ,
      now,
      durationMin: 60,
      minLeadMinutes: 60,
    });
    expect(next).not.toBeNull();
    expect(next!.date).toBe("2026-05-25");
    expect(next!.isToday).toBe(true);
    expect(next!.time >= "13:00").toBe(true);
  });

  it("rolls to the next workday when today is closed", () => {
    // Sunday 2026-05-24 — studio closed.
    const now = new Date("2026-05-24T08:00:00Z");
    const next = getNextOpening({
      workingHours: HOURS_MON_TO_FRI,
      timeZone: TZ,
      now,
    });
    expect(next).not.toBeNull();
    expect(next!.isToday).toBe(false);
    expect(next!.date).toBe("2026-05-25");
  });

  it("returns null when no working hours are configured", () => {
    const now = new Date("2026-05-25T09:00:00Z");
    expect(
      getNextOpening({
        workingHours: [],
        timeZone: TZ,
        now,
      }),
    ).toBeNull();
  });

  it("respects busy windows by skipping conflicted slots", () => {
    const now = new Date("2026-05-25T07:00:00Z"); // 10:00 Minsk
    const next = getNextOpening({
      workingHours: HOURS_MON_TO_FRI,
      timeZone: TZ,
      now,
      durationMin: 60,
      minLeadMinutes: 0,
      busy: [
        // Block all of today (10-19 local = 07-16 UTC).
        {
          start: new Date("2026-05-25T07:00:00Z"),
          end: new Date("2026-05-25T16:00:00Z"),
        },
      ],
    });
    expect(next).not.toBeNull();
    expect(next!.date).not.toBe("2026-05-25");
  });

  it("attaches the supplied service label", () => {
    const now = new Date("2026-05-25T07:00:00Z");
    const next = getNextOpening({
      workingHours: HOURS_MON_TO_FRI,
      timeZone: TZ,
      now,
      serviceLabel: "Manicure couture",
      minLeadMinutes: 0,
    });
    expect(next?.serviceLabel).toBe("Manicure couture");
  });
});
