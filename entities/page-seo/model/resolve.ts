import type { Locale } from "@/i18n/routing";
import type { PageSeoEntry, PageSeoOverrides, ResolvedPageSeo } from "./types";

const TITLE_FIELD: Record<Locale, keyof PageSeoEntry> = {
  en: "titleEn",
  ru: "titleRu",
  by: "titleBy",
};

const HEADING_FIELD: Record<Locale, keyof PageSeoEntry> = {
  en: "headingEn",
  ru: "headingRu",
  by: "headingBy",
};

const DESCRIPTION_FIELD: Record<Locale, keyof PageSeoEntry> = {
  en: "descriptionEn",
  ru: "descriptionRu",
  by: "descriptionBy",
};

/**
 * Resolve a stored override to a locale-specific SEO title / visible
 * heading / description. Blank (or whitespace-only) values are treated as
 * "no override" and omitted, so the caller falls back to its translation
 * default.
 */
export function resolvePageSeoEntry(
  entry: PageSeoEntry | undefined,
  locale: Locale,
): ResolvedPageSeo {
  if (!entry) return {};
  const title = entry[TITLE_FIELD[locale]]?.trim();
  const heading = entry[HEADING_FIELD[locale]]?.trim();
  const description = entry[DESCRIPTION_FIELD[locale]]?.trim();
  return {
    ...(title ? { title } : {}),
    ...(heading ? { heading } : {}),
    ...(description ? { description } : {}),
  };
}

export function resolvePageSeo(
  overrides: PageSeoOverrides,
  id: string,
  locale: Locale,
): ResolvedPageSeo {
  return resolvePageSeoEntry(overrides[id], locale);
}
