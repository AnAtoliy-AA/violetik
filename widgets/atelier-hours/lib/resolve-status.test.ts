import { describe, it, expect } from "vitest";
import { resolveAtelierStatus } from "./resolve-status";
import { WEEKLY_DEFAULT_HOURS } from "@/shared/lib/google-calendar";

// All tests construct `now` in local time. Tue–Sat 10:00–19:00, Sun/Mon closed.

describe("resolveAtelierStatus", () => {
  it("returns no-hours when the schedule is empty", () => {
    expect(resolveAtelierStatus([])).toEqual({ state: "no-hours" });
  });

  it("reports open when current time falls inside today's window", () => {
    // 2026-05-19 was a Tuesday at 14:30 local.
    const now = new Date(2026, 4, 19, 14, 30);
    expect(resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, now)).toEqual({
      state: "open",
      closesAt: "19:00",
    });
  });

  it("reports closed-with-today's-open when today is in-schedule but before opening", () => {
    // Tuesday at 08:15 local — opens later today at 10:00.
    const now = new Date(2026, 4, 19, 8, 15);
    expect(resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, now)).toEqual({
      state: "closed",
      opensAt: { dayOfWeek: 2, time: "10:00" },
    });
  });

  it("rolls forward to the next open day when today's window has ended", () => {
    // Tuesday at 21:30 local — closed; next open is Wednesday (dow 3) at 10:00.
    const now = new Date(2026, 4, 19, 21, 30);
    expect(resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, now)).toEqual({
      state: "closed",
      opensAt: { dayOfWeek: 3, time: "10:00" },
    });
  });

  it("skips closed days (Sunday) and surfaces the next open day", () => {
    // Sunday at 11:00 local — next open is Tuesday (dow 2) at 10:00.
    const now = new Date(2026, 4, 17, 11, 0);
    expect(resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, now)).toEqual({
      state: "closed",
      opensAt: { dayOfWeek: 2, time: "10:00" },
    });
  });

  it("wraps the week — Saturday after close points to next Tuesday", () => {
    // Saturday at 21:30 local — Sun + Mon are closed, opens Tue.
    const now = new Date(2026, 4, 23, 21, 30);
    expect(resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, now)).toEqual({
      state: "closed",
      opensAt: { dayOfWeek: 2, time: "10:00" },
    });
  });
});
