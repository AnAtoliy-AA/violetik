import { describe, it, expect } from "vitest";
import { getTimeZoneList, isValidTimeZone } from "./time-zones";

describe("time-zones", () => {
  it("returns a non-empty IANA list containing the studio default", () => {
    const list = getTimeZoneList();
    expect(list.length).toBeGreaterThan(100);
    expect(list).toContain("Europe/Minsk");
    expect(list).toContain("UTC");
  });

  it("caches the list across calls", () => {
    expect(getTimeZoneList()).toBe(getTimeZoneList());
  });

  it("accepts valid IANA zones and rejects garbage", () => {
    expect(isValidTimeZone("Europe/Minsk")).toBe(true);
    expect(isValidTimeZone("Europe/Atlantis")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
