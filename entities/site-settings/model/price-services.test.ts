import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./types";
import { priceServices } from "./price-services";

describe("priceServices", () => {
  it("returns an empty map for an empty list", () => {
    expect(priceServices([], DEFAULT_SITE_SETTINGS)).toEqual({});
  });

  it("keys each resolved price by service id", () => {
    const map = priceServices(
      [
        { id: "gel", price: 100 },
        { id: "art", price: 150 },
      ],
      DEFAULT_SITE_SETTINGS,
    );
    expect(map).toEqual({
      gel: { base: 100, effective: 100, hasDiscount: false },
      art: { base: 150, effective: 150, hasDiscount: false },
    });
  });

  it("applies an active discount to every service", () => {
    const map = priceServices([{ id: "gel", price: 100 }], {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 20,
      discountActive: true,
    });
    expect(map.gel).toEqual({ base: 100, effective: 80, hasDiscount: true });
  });

  it("honors per-service overrides via the service:<id> key", () => {
    const map = priceServices([{ id: "gel", price: 100 }], {
      ...DEFAULT_SITE_SETTINGS,
      priceOverrides: { "service:gel": 160 },
    });
    expect(map.gel).toEqual({ base: 160, effective: 160, hasDiscount: false });
  });
});
