import { describe, it, expect } from "vitest";
import {
  BOOKING_STEPS,
  buildDateStrip,
  formatLongDate,
  indexOfStep,
  isBookingStep,
  nextStep,
  prevStep,
  RESERVED_TIMES,
  BOOKING_TIMES,
} from "./booking-steps";

describe("booking-steps", () => {
  it("isBookingStep accepts known steps and rejects others", () => {
    for (const s of BOOKING_STEPS) expect(isBookingStep(s)).toBe(true);
    expect(isBookingStep("foo")).toBe(false);
    expect(isBookingStep("")).toBe(false);
  });

  it("nextStep / prevStep walk the sequence and bound at ends", () => {
    expect(nextStep("service")).toBe("date");
    expect(nextStep("confirm")).toBeNull();
    expect(prevStep("service")).toBeNull();
    expect(prevStep("confirm")).toBe("time");
  });

  it("indexOfStep is consistent with BOOKING_STEPS ordering", () => {
    BOOKING_STEPS.forEach((step, i) => {
      expect(indexOfStep(step)).toBe(i);
    });
  });

  it("buildDateStrip returns 14 days starting Tue May 19", () => {
    const days = buildDateStrip("en-US");
    expect(days).toHaveLength(14);
    expect(days[0].iso).toBe("2026-05-19");
    expect(days[13].iso).toBe("2026-06-01");
    expect(days[0].disabled).toBe(false); // Tue
    expect(days[5].disabled).toBe(true); // Sun
    expect(days[6].disabled).toBe(true); // Mon
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
