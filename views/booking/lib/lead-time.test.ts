import { describe, it, expect } from "vitest";
import { isTooSoon } from "./lead-time";

describe("isTooSoon", () => {
  const now = new Date("2026-05-24T12:00:00Z");

  it("returns true when scheduledFor is in the past", () => {
    expect(isTooSoon(new Date("2026-05-24T11:00:00Z"), now, 180)).toBe(true);
  });

  it("returns true when scheduledFor is within the lead window", () => {
    // 2h59m from now, lead = 3h
    expect(isTooSoon(new Date("2026-05-24T14:59:00Z"), now, 180)).toBe(true);
  });

  it("returns false when scheduledFor is exactly at the lead boundary", () => {
    expect(isTooSoon(new Date("2026-05-24T15:00:00Z"), now, 180)).toBe(false);
  });

  it("returns false when scheduledFor is well past the lead window", () => {
    expect(isTooSoon(new Date("2026-05-25T10:00:00Z"), now, 180)).toBe(false);
  });

  it("respects a zero lead (only past instants are too soon)", () => {
    expect(isTooSoon(new Date("2026-05-24T11:59:59Z"), now, 0)).toBe(true);
    expect(isTooSoon(new Date("2026-05-24T12:00:00Z"), now, 0)).toBe(false);
  });
});
