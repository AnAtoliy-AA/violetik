import { describe, it, expect } from "vitest";
import { buildTonightStripData } from "./get-tonight-data";
import type { WorkingWindow } from "@/shared/lib/google-calendar/types";

const HOURS: WorkingWindow[] = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
];

describe("buildTonightStripData", () => {
  it("returns isToday=true with later slots when the studio still has openings", () => {
    // Monday 2026-05-25 13:00 Minsk → today still has slots.
    const data = buildTonightStripData({
      workingHours: HOURS,
      now: new Date("2026-05-25T10:00:00Z"),
      serviceLabel: "Sculpture",
    });
    expect(data).not.toBeNull();
    expect(data!.isToday).toBe(true);
    expect(data!.service).toBe("Sculpture");
    expect(data!.laterSlots?.length).toBeGreaterThanOrEqual(1);
  });

  it("returns isToday=false with next-day fallback when today is over", () => {
    // Monday 2026-05-25 23:00 local → no more openings today.
    const data = buildTonightStripData({
      workingHours: HOURS,
      now: new Date("2026-05-25T20:00:00Z"),
    });
    expect(data).not.toBeNull();
    expect(data!.isToday).toBe(false);
    expect(data!.next).toBeDefined();
  });

  it("returns null when no working hours are configured", () => {
    expect(buildTonightStripData({ workingHours: [] })).toBeNull();
  });
});
