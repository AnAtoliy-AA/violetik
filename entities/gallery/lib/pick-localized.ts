import type { Locale } from "@/i18n/routing";

/** Row carrying a name in all three locales (gallery categories). */
export interface LocalizedNameRow {
  nameEn: string;
  nameRu: string;
  nameBy: string;
}

/** Row carrying an optional caption in all three locales (gallery items). */
export interface LocalizedCaptionRow {
  captionEn: string | null;
  captionRu: string | null;
  captionBy: string | null;
}

/** Resolve a category name for the active locale. Pure + type-only imports. */
export function pickLocalizedName(row: LocalizedNameRow, locale: Locale): string {
  if (locale === "ru") return row.nameRu;
  if (locale === "by") return row.nameBy;
  return row.nameEn;
}

/**
 * Resolve an item caption for the active locale. Returns null when the row
 * has no caption set for that locale, so the view can fall back to the
 * category name (the legacy auto-generated lightbox caption behavior).
 */
export function pickLocalizedCaption(
  row: LocalizedCaptionRow,
  locale: Locale,
): string | null {
  const value =
    locale === "ru" ? row.captionRu : locale === "by" ? row.captionBy : row.captionEn;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
