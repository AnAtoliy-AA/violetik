import { describe, expect, it } from "vitest";
import { canSelfCancel } from "./can-self-cancel";

const HOUR = 60 * 60 * 1000;

describe("canSelfCancel", () => {
  const now = new Date("2026-05-23T12:00:00Z");

  it("returns true when scheduledFor is 24h + 1 minute away", () => {
    const scheduled = new Date(now.getTime() + 24 * HOUR + 60_000);
    expect(canSelfCancel(now, scheduled)).toBe(true);
  });

  it("returns false at exactly 24h", () => {
    const scheduled = new Date(now.getTime() + 24 * HOUR);
    expect(canSelfCancel(now, scheduled)).toBe(false);
  });

  it("returns false at 24h - 1 minute", () => {
    const scheduled = new Date(now.getTime() + 24 * HOUR - 60_000);
    expect(canSelfCancel(now, scheduled)).toBe(false);
  });

  it("returns false for past times", () => {
    const scheduled = new Date(now.getTime() - HOUR);
    expect(canSelfCancel(now, scheduled)).toBe(false);
  });

  it("returns false when scheduledFor equals now", () => {
    expect(canSelfCancel(now, now)).toBe(false);
  });
});
