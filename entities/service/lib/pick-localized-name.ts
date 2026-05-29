import type { Locale } from "@/i18n/routing";

/**
 * Minimal shape shared by every i18n'd row that carries a name in all
 * three locales (service categories, services, masters). Pure + type-only
 * imports, so this is safe to use in client components and stories.
 */
export interface LocalizedNameRow {
  nameEn: string;
  nameRu: string;
  nameBy: string;
}

/**
 * Resolve a row's name for the active locale. Mirrors the server-side
 * `pickName` in entities/service/api/load.ts, but with no DB coupling so
 * admin client components can localize names they receive as raw rows.
 */
export function pickLocalizedName(row: LocalizedNameRow, locale: Locale): string {
  if (locale === "ru") return row.nameRu;
  if (locale === "by") return row.nameBy;
  return row.nameEn;
}
