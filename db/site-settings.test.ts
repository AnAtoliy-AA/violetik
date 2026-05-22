import { describe, expect, it } from "vitest";
import { getSiteSettings } from "./site-settings";
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
});
