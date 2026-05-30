/**
 * Per-page SEO override. Per locale: the SEO `title*` (document <title> /
 * meta title, kept short), the visible `heading*` (on-page H1, may be
 * longer), and the `description*` (feeds both meta and the visible lede).
 * An empty string means "no override — fall back to the translation
 * default".
 */
export interface PageSeoEntry {
  titleEn: string;
  titleRu: string;
  titleBy: string;
  headingEn: string;
  headingRu: string;
  headingBy: string;
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
  headingEn: "",
  headingRu: "",
  headingBy: "",
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
  heading?: string;
  description?: string;
}
