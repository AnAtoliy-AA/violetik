import { describe, it, expect, vi } from "vitest";
import { slotCache } from "./cache";

describe("slotCache", () => {
  it("returns the value within TTL and undefined after", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T10:00:00Z"));
    slotCache.set("k", ["10:00", "10:30"]);
    expect(slotCache.get("k")).toEqual(["10:00", "10:30"]);

    vi.setSystemTime(new Date("2026-05-19T10:00:59Z"));
    expect(slotCache.get("k")).toEqual(["10:00", "10:30"]);

    vi.setSystemTime(new Date("2026-05-19T10:01:01Z"));
    expect(slotCache.get("k")).toBeUndefined();
    vi.useRealTimers();
  });
});
