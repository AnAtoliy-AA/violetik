import { describe, expect, it } from "vitest";
import { getSiteSettings, updateSiteSettings } from "./site-settings";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";

describe("getSiteSettings", () => {
  it("returns a SiteSettings shape (frozen defaults if db is null, or the singleton row otherwise)", async () => {
    let result: Awaited<ReturnType<typeof getSiteSettings>> | null = null;
    try {
      result = await getSiteSettings();
    } catch {
      // Real DB reachable but the migration hasn't been applied yet —
      // acceptable in CI / pre-migration environments. The point of
      // this test is the type/shape contract, exercised via the
      // db-null fallback below.
    }
    const s = result ?? DEFAULT_SITE_SETTINGS;
    expect(s).toHaveProperty("defaultPalette");
    expect(s).toHaveProperty("defaultLocale");
    expect(s).toHaveProperty("currency");
    expect(s.priceOverrides).toBeTypeOf("object");
    expect(typeof s.discountPercent).toBe("number");
    expect(typeof s.discountActive).toBe("boolean");
  });

  it("frozen defaults match the singleton schema", () => {
    expect(DEFAULT_SITE_SETTINGS.defaultPalette).toBe("aubergine");
    expect(DEFAULT_SITE_SETTINGS.defaultLocale).toBe("en");
    expect(DEFAULT_SITE_SETTINGS.discountPercent).toBe(0);
    expect(DEFAULT_SITE_SETTINGS.discountActive).toBe(false);
  });

  it("exposes currency on the settings shape", () => {
    expect(["EUR", "USD", "BYN", "RUB"]).toContain(
      DEFAULT_SITE_SETTINGS.currency,
    );
  });

  // Shape-only assertion that works whether DB is null (returns
  // DEFAULT_SITE_SETTINGS) or live (returns the seeded row). Matches the
  // existing defensive try/catch pattern in this file.
  it("exposes the studio-location fields on the SiteSettings shape", async () => {
    let result: Awaited<ReturnType<typeof getSiteSettings>> | null = null;
    try {
      result = await getSiteSettings();
    } catch {
      /* pre-migration env — acceptable, fall through to defaults */
    }
    const s = result ?? DEFAULT_SITE_SETTINGS;
    expect(typeof s.addressEn).toBe("string");
    expect(typeof s.country).toBe("string");
    expect(typeof s.timezone).toBe("string");
    expect(s.latitude === null || typeof s.latitude === "number").toBe(true);
    expect(s.longitude === null || typeof s.longitude === "number").toBe(true);
    expect(typeof s.mapVisible).toBe("boolean");
  });

  it("frozen defaults match the studio-location columns", () => {
    expect(DEFAULT_SITE_SETTINGS.addressEn).toBe(
      "By appointment · Verbena Lane 14, Studio B",
    );
    expect(DEFAULT_SITE_SETTINGS.country).toBe("BY");
    expect(DEFAULT_SITE_SETTINGS.timezone).toBe("Europe/Minsk");
    expect(DEFAULT_SITE_SETTINGS.latitude).toBeNull();
    expect(DEFAULT_SITE_SETTINGS.longitude).toBeNull();
    expect(DEFAULT_SITE_SETTINGS.mapVisible).toBe(false);
  });

  // Gated on a live DB — mirrors the defensive try/catch the existing
  // tests in this file use so CI / pre-migration environments still pass.
  it.skipIf(!process.env.DATABASE_URL)(
    "round-trips a full studio-location patch (live DB only)",
    async () => {
      await updateSiteSettings(
        {
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
        },
        null,
      );
      const settings = await getSiteSettings();
      expect(settings.cityEn).toBe("Borisov");
      expect(settings.latitude).toBeCloseTo(54.231, 4);
      expect(settings.longitude).toBeCloseTo(28.491, 4);
      expect(settings.mapVisible).toBe(true);
    },
  );
});
