import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsPatchSchema,
  type SiteSettings,
  type SiteSettingsPatch,
} from "@/entities/site-settings";
import type { PaletteId } from "@/shared/config/palettes";
import type { Locale } from "@/i18n/routing";

const SINGLETON_ID = "singleton";

function rowToSettings(row: schema.SiteSettingsRow): SiteSettings {
  return {
    defaultPalette: row.defaultPalette as PaletteId,
    defaultLocale: row.defaultLocale as Locale,
    priceOverrides: row.priceOverrides ?? {},
    discountPercent: row.discountPercent,
    discountActive: row.discountActive,
    currency: row.currency,
    addressEn: row.addressEn,
    addressRu: row.addressRu,
    addressBy: row.addressBy,
    country: row.country,
    cityEn: row.cityEn,
    cityRu: row.cityRu,
    cityBy: row.cityBy,
    timezone: row.timezone,
    latitude: row.latitude,
    longitude: row.longitude,
    mapVisible: row.mapVisible,
    telegramUsername: row.telegramUsername ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Reads the singleton site_settings row, lazily inserting a defaults
 * row on first call. Returns frozen defaults when DATABASE_URL is
 * unset so the app degrades gracefully in local dev / CI, or when the
 * read fails (pre-migration build-time SSG, missing table, etc.).
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!db) return DEFAULT_SITE_SETTINGS;

  try {
    const existing = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.id, SINGLETON_ID))
      .limit(1);
    if (existing.length > 0) return rowToSettings(existing[0]);

    const inserted = await db
      .insert(schema.siteSettings)
      .values({ id: SINGLETON_ID })
      .onConflictDoNothing({ target: schema.siteSettings.id })
      .returning();
    if (inserted.length > 0) return rowToSettings(inserted[0]);

    const refetch = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.id, SINGLETON_ID))
      .limit(1);
    return refetch.length > 0
      ? rowToSettings(refetch[0])
      : DEFAULT_SITE_SETTINGS;
  } catch (error) {
    // The migration may not have been applied (build-time SSG hitting
    // a pre-migration DB, etc.). Same graceful-degradation philosophy
    // as `db === null`: fall back to defaults so the app keeps working.
    console.warn(
      "[db/site-settings] read failed, returning defaults:",
      error instanceof Error ? error.message : error,
    );
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * Validates the patch via Zod and updates the singleton row. No-op
 * when the DB isn't configured (returns frozen defaults). Throws on
 * validation failure — callers (the server action) catch and surface.
 */
export async function updateSiteSettings(
  patch: SiteSettingsPatch,
  updatedBy: string | null,
): Promise<SiteSettings> {
  const parsed = siteSettingsPatchSchema.parse(patch);
  if (!db) return DEFAULT_SITE_SETTINGS;

  await getSiteSettings();
  const rows = await db
    .update(schema.siteSettings)
    .set({
      ...parsed,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(schema.siteSettings.id, SINGLETON_ID))
    .returning();
  return rowToSettings(rows[0]);
}
