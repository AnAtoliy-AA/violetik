import type { Locale } from "@/i18n/routing";

/**
 * Resolve one of a row's three locale variants. Pure + type-only imports,
 * so it's safe in client components and stories.
 */
export function pickLocale(
  row: { en: string; ru: string; by: string },
  locale: Locale,
): string {
  if (locale === "ru") return row.ru;
  if (locale === "by") return row.by;
  return row.en;
}
