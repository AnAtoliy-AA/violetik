import { describe, expect, it } from "vitest";
import { siteSettingsPatchSchema } from "./schema";

describe("siteSettingsPatchSchema", () => {
  it("accepts an empty patch", () => {
    expect(siteSettingsPatchSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a service price override", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "service:gel": 150 },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a Member override (only VIP is allowed)", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "membership:Member": 50 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown override key shape", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "garbage:foo": 50 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown palette", () => {
    const r = siteSettingsPatchSchema.safeParse({ defaultPalette: "neon" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown locale", () => {
    const r = siteSettingsPatchSchema.safeParse({ defaultLocale: "de" });
    expect(r.success).toBe(false);
  });

  it("rejects discountPercent > 90", () => {
    const r = siteSettingsPatchSchema.safeParse({ discountPercent: 91 });
    expect(r.success).toBe(false);
  });

  it("rejects negative discount", () => {
    const r = siteSettingsPatchSchema.safeParse({ discountPercent: -5 });
    expect(r.success).toBe(false);
  });

  it("rejects negative prices", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "service:gel": -10 },
    });
    expect(r.success).toBe(false);
  });
});
