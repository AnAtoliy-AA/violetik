import { describe, it, expect } from "vitest";
import { STUDIO_DATA } from "./data";

describe("STUDIO_DATA", () => {
  it("has at least one service in every category", () => {
    const categories = new Set(STUDIO_DATA.services.map((s) => s.category));
    expect(categories).toEqual(new Set(["Care", "Gel", "Design", "Form"]));
  });

  it("service ids are unique", () => {
    const ids = STUDIO_DATA.services.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 3 membership tiers in the canonical order", () => {
    expect(STUDIO_DATA.membership.map((m) => m.tier)).toEqual([
      "Petale",
      "Violette",
      "Atelier",
    ]);
  });

  it("exactly one membership tier is featured", () => {
    expect(STUDIO_DATA.membership.filter((m) => m.featured)).toHaveLength(1);
  });

  it("gallery item heights are within the masonry range (220–300)", () => {
    for (const item of STUDIO_DATA.gallery) {
      expect(item.h).toBeGreaterThanOrEqual(220);
      expect(item.h).toBeLessThanOrEqual(300);
    }
  });
});
