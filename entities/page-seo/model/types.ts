/**
 * Per-page SEO override. One stored value per locale for both the
 * document title and the meta description. An empty string means
 * "no override — fall back to the translation default".
 */
export interface PageSeoEntry {
  titleEn: string;
  titleRu: string;
  titleBy: string;
  descriptionEn: string;
  descriptionRu: string;
  descriptionBy: string;
}

/** Overrides keyed by page id (see PAGE_SEO_PAGES). */
export type PageSeoOverrides = Readonly<Record<string, PageSeoEntry>>;

export const EMPTY_PAGE_SEO_ENTRY: PageSeoEntry = Object.freeze({
  titleEn: "",
  titleRu: "",
  titleBy: "",
  descriptionEn: "",
  descriptionRu: "",
  descriptionBy: "",
});

/**
 * The resolved override for a single page in a single locale. Fields are
 * omitted when blank so callers can fall back with `?? default`.
 */
export interface ResolvedPageSeo {
  title?: string;
  description?: string;
}
