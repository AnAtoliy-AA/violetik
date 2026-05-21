import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./types";
import { resolvePrice } from "./resolve-price";

describe("resolvePrice", () => {
  it("returns the catalog price unchanged when no override + no discount", () => {
    const r = resolvePrice("service:gel", 145, DEFAULT_SITE_SETTINGS);
    expect(r).toEqual({ base: 145, effective: 145, hasDiscount: false });
  });

  it("uses an override over the catalog price", () => {
    const r = resolvePrice("service:gel", 145, {
      ...DEFAULT_SITE_SETTINGS,
      priceOverrides: { "service:gel": 160 },
    });
    expect(r).toEqual({ base: 160, effective: 160, hasDiscount: false });
  });

  it("applies an active discount to the effective price", () => {
    const r = resolvePrice("service:gel", 100, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 20,
      discountActive: true,
    });
    expect(r).toEqual({ base: 100, effective: 80, hasDiscount: true });
  });

  it("ignores discount when discountActive is false", () => {
    const r = resolvePrice("service:gel", 100, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 20,
      discountActive: false,
    });
    expect(r).toEqual({ base: 100, effective: 100, hasDiscount: false });
  });

  it("rounds the effective price to a whole euro", () => {
    const r = resolvePrice("service:gel", 95, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 15,
      discountActive: true,
    });
    // 95 * 0.85 = 80.75 → 81
    expect(r.effective).toBe(81);
  });

  it("stacks override + discount", () => {
    const r = resolvePrice("service:gel", 145, {
      ...DEFAULT_SITE_SETTINGS,
      priceOverrides: { "service:gel": 200 },
      discountPercent: 10,
      discountActive: true,
    });
    expect(r).toEqual({ base: 200, effective: 180, hasDiscount: true });
  });

  it("treats price 0 as free (never discounted)", () => {
    const r = resolvePrice("service:free", 0, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 30,
      discountActive: true,
    });
    expect(r).toEqual({ base: 0, effective: 0, hasDiscount: false });
  });
});
