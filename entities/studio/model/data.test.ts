import { describe, it, expect } from "vitest";
import { STUDIO_DATA } from "./data";

describe("STUDIO_DATA", () => {
  it("has 2 membership tiers in the canonical order", () => {
    expect(STUDIO_DATA.membership.map((m) => m.tier)).toEqual([
      "Member",
      "VIP",
    ]);
  });

  it("exactly one membership tier is featured", () => {
    expect(STUDIO_DATA.membership.filter((m) => m.featured)).toHaveLength(1);
  });

  it("gallery item heights are within the masonry range (200–300)", () => {
    for (const item of STUDIO_DATA.gallery) {
      expect(item.h).toBeGreaterThanOrEqual(200);
      expect(item.h).toBeLessThanOrEqual(300);
    }
  });
});
