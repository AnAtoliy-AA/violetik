import { describe, it, expect } from "vitest";
import {
  BOOKING_STEPS,
  buildDateStrip,
  bookingStartISO,
  effectiveBookingSteps,
  formatLongDate,
  indexOfStep,
  isBookingStep,
  MIN_BOOKING_LEAD_MINUTES,
  nextStep,
  prevStep,
  RESERVED_TIMES,
  BOOKING_TIMES,
} from "./booking-steps";

describe("booking-steps", () => {
  it("isBookingStep accepts every known step including legacy + collapsed forms", () => {
    for (const s of BOOKING_STEPS) expect(isBookingStep(s)).toBe(true);
    // §6.1 — legacy /date and /time still resolve so deep-links survive.
    expect(isBookingStep("date")).toBe(true);
    expect(isBookingStep("time")).toBe(true);
    // §6.2 — new collapsed step.
    expect(isBookingStep("when")).toBe(true);
    expect(isBookingStep("foo")).toBe(false);
    expect(isBookingStep("")).toBe(false);
  });

  it("nextStep / prevStep walk the effective flow for a solo studio (3 steps)", () => {
    const solo = effectiveBookingSteps(1);
    expect(solo).toEqual(["service", "when", "confirm"]);
    expect(nextStep("service", solo)).toBe("when");
    expect(nextStep("when", solo)).toBe("confirm");
    expect(nextStep("confirm", solo)).toBeNull();
    expect(prevStep("service", solo)).toBeNull();
    expect(prevStep("when", solo)).toBe("service");
    expect(prevStep("confirm", solo)).toBe("when");
  });

  it("nextStep / prevStep reintroduce master when multiple masters exist", () => {
    const multi = effectiveBookingSteps(3);
    expect(multi).toEqual(["service", "master", "when", "confirm"]);
    expect(nextStep("service", multi)).toBe("master");
    expect(nextStep("master", multi)).toBe("when");
    expect(prevStep("when", multi)).toBe("master");
  });

  it("indexOfStep maps legacy /date and /time to the collapsed /when slot", () => {
    const solo = effectiveBookingSteps(1);
    expect(indexOfStep("date", solo)).toBe(solo.indexOf("when"));
    expect(indexOfStep("time", solo)).toBe(solo.indexOf("when"));
    expect(indexOfStep("service", solo)).toBe(0);
    expect(indexOfStep("confirm", solo)).toBe(solo.length - 1);
  });

  it("bookingStartISO returns the civil date in the studio timezone", () => {
    // 23:30 UTC on Sat → 02:30 Sun in Europe/Minsk (UTC+3)
    expect(
      bookingStartISO(new Date("2026-05-23T23:30:00Z"), "Europe/Minsk"),
    ).toBe("2026-05-24");
    // Same instant in UTC → still Sat
    expect(
      bookingStartISO(new Date("2026-05-23T23:30:00Z"), "UTC"),
    ).toBe("2026-05-23");
  });

  it("buildDateStrip returns 14 days starting at today's civil date in tz", () => {
    // Tue 2026-05-19 08:00 Europe/Minsk
    const now = new Date("2026-05-19T05:00:00Z");
    const days = buildDateStrip("en-US", "Europe/Minsk", now);
    expect(days).toHaveLength(14);
    expect(days[0].iso).toBe("2026-05-19"); // Tue
    expect(days[13].iso).toBe("2026-06-01"); // Mon two weeks out
    expect(days[0].disabled).toBe(false); // Tue
    expect(days[5].disabled).toBe(true); // Sun
    expect(days[6].disabled).toBe(true); // Mon
  });

  it("buildDateStrip disables the first cell when today is a closed day", () => {
    // Sunday 2026-05-24 10:00 Europe/Minsk
    const now = new Date("2026-05-24T07:00:00Z");
    const days = buildDateStrip("en-US", "Europe/Minsk", now);
    expect(days[0].iso).toBe("2026-05-24");
    expect(days[0].disabled).toBe(true); // Sun
    expect(days[1].disabled).toBe(true); // Mon
    expect(days[2].disabled).toBe(false); // Tue
  });

  it("buildDateStrip defaults `now` to the system clock", () => {
    const days = buildDateStrip("en-US", "Europe/Minsk");
    expect(days).toHaveLength(14);
    expect(days[0].iso).toBe(bookingStartISO(new Date(), "Europe/Minsk"));
  });

  it("MIN_BOOKING_LEAD_MINUTES is the canonical lead-time constant", () => {
    expect(MIN_BOOKING_LEAD_MINUTES).toBe(180);
  });

  it("reserved times are a subset of the booking times", () => {
    for (const t of RESERVED_TIMES) {
      expect(BOOKING_TIMES).toContain(t);
    }
  });

  it("formatLongDate renders a localized weekday/month string", () => {
    const en = formatLongDate("2026-05-22", "en-US");
    expect(en).toMatch(/Fri/);
    expect(en).toMatch(/May/);
    expect(en).toMatch(/22/);
  });
});
