import { describe, it, expect } from "vitest";
import { tonightCandidateDays, weekdayLabel } from "./get-tonight-data";

describe("tonightCandidateDays", () => {
  it("returns today then tomorrow in the studio timezone", () => {
    // 2026-05-25 10:00Z → 13:00 Minsk (UTC+3); tomorrow is 2026-05-26.
    const days = tonightCandidateDays(
      new Date("2026-05-25T10:00:00Z"),
      "Europe/Minsk",
    );
    expect(days).toHaveLength(2);
    expect(days[0]).toEqual({ dateISO: "2026-05-25", isToday: true });
    expect(days[1]).toEqual({ dateISO: "2026-05-26", isToday: false });
  });

  it("rolls to the next civil day late at night in the studio tz", () => {
    // 2026-05-25 22:30Z → 01:30 next day in Minsk, so "today" is the 26th.
    const days = tonightCandidateDays(
      new Date("2026-05-25T22:30:00Z"),
      "Europe/Minsk",
    );
    expect(days[0].dateISO).toBe("2026-05-26");
    expect(days[1].dateISO).toBe("2026-05-27");
  });
});

describe("weekdayLabel", () => {
  it("formats an uppercase short weekday for the given locale", () => {
    // 2026-05-26 is a Tuesday.
    expect(weekdayLabel("2026-05-26", "en")).toBe("TUE");
  });
});
