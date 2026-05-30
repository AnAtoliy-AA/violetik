import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { resolvePageSeo, type PageSeoId } from "@/entities/page-seo";
import { getPageSeoServer } from "./page-seo-server";

export interface BuildPageMetadataOptions {
  locale: string;
  /** Page id from PAGE_SEO_PAGES — the override lookup key. */
  pageId: PageSeoId;
  /** Title used when no admin override exists for this locale. */
  fallbackTitle: string;
  /**
   * Description used when no admin override exists for this locale.
   * Defaults to the site-wide description (`Site.description`).
   */
  fallbackDescription?: string;
  /**
   * Route path, e.g. "/home". Accepted for call-site clarity but not
   * used here — canonical + hreflang are owned by the locale layout.
   */
  path?: string;
}

/**
 * Builds a page's `Metadata` by layering an admin SEO override (from the
 * `page_seo` table) over the translation default.
 *
 * Only the document title and meta description are set here — these are
 * the two fields an admin can edit per page. OpenGraph, Twitter, the
 * file-convention `og:image`, the canonical URL, and the hreflang
 * alternates are all supplied by the locale layout
 * (`app/[locale]/layout.tsx`) and inherited unchanged, so this builder
 * never strips them (setting an `openGraph` object here would drop the
 * auto-injected `og:image`).
 */
export async function buildPageMetadata(
  opts: BuildPageMetadataOptions,
): Promise<Metadata> {
  const { locale, pageId, fallbackTitle } = opts;

  const overrides = await getPageSeoServer();
  const override = resolvePageSeo(overrides, pageId, locale as Locale);

  // Title is always set (override or per-page fallback), matching prior
  // behaviour. Description is only set when an admin override exists or a
  // page supplies an explicit fallback — otherwise it's left unset so the
  // locale layout's description (which may be city-templated for SEO)
  // inherits through unchanged.
  const description = override.description ?? opts.fallbackDescription;

  return {
    title: override.title ?? fallbackTitle,
    ...(description ? { description } : {}),
  };
}
