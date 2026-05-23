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

describe("studio-location fields", () => {
  it("accepts a valid full patch", () => {
    const ok = siteSettingsPatchSchema.safeParse({
      addressEn: "12 Rose Street",
      addressRu: "12 Розовая",
      addressBe: "12 Ружовая",
      country: "BY",
      cityEn: "Borisov",
      cityRu: "Борисов",
      cityBe: "Барысаў",
      timezone: "Europe/Minsk",
      latitude: 54.231,
      longitude: 28.491,
      mapVisible: true,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects an unknown ISO country code", () => {
    const bad = siteSettingsPatchSchema.safeParse({ country: "ZZ" });
    expect(bad.success).toBe(false);
  });

  it("rejects out-of-range latitude", () => {
    expect(siteSettingsPatchSchema.safeParse({ latitude: 91 }).success).toBe(false);
    expect(siteSettingsPatchSchema.safeParse({ latitude: -91 }).success).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(siteSettingsPatchSchema.safeParse({ longitude: 181 }).success).toBe(false);
    expect(siteSettingsPatchSchema.safeParse({ longitude: -181 }).success).toBe(false);
  });

  it("rejects unknown IANA timezone", () => {
    const bad = siteSettingsPatchSchema.safeParse({ timezone: "Europe/Atlantis" });
    expect(bad.success).toBe(false);
  });

  it("rejects mapVisible:true when coords are null", () => {
    const bad = siteSettingsPatchSchema.safeParse({
      mapVisible: true,
      latitude: null,
      longitude: null,
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a half-pair lat/lng patch", () => {
    const half = siteSettingsPatchSchema.safeParse({
      latitude: 54.2,
      longitude: null,
    });
    expect(half.success).toBe(false);
  });

  it("accepts a fully-null coordinate patch (clearing coords)", () => {
    const ok = siteSettingsPatchSchema.safeParse({
      latitude: null,
      longitude: null,
      mapVisible: false,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects addresses longer than 200 chars", () => {
    const bad = siteSettingsPatchSchema.safeParse({ addressEn: "a".repeat(201) });
    expect(bad.success).toBe(false);
  });
});
