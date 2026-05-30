import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  PAGE_SEO_BY_ID,
  resolvePageHeading,
  type PageSeoId,
} from "@/entities/page-seo";
import { getPageSeoServer } from "./page-seo-server";

export interface BuildPageMetadataOptions {
  locale: string;
  /** Page id from PAGE_SEO_PAGES — the override lookup key. */
  pageId: PageSeoId;
  /**
   * Route path, e.g. "/home". Accepted for call-site clarity but not
   * used here — canonical + hreflang are owned by the locale layout.
   */
  path?: string;
}

/**
 * Builds a page's `Metadata` from the single source of truth shared with the
 * on-page hero (`usePageHeading`): the admin SEO override when set, otherwise
 * the flat hero copy (title keys joined + lede paragraph). Meta tag and
 * visible heading therefore always render identical title/description.
 *
 * Only the document title and meta description are set here. OpenGraph,
 * Twitter, the file-convention `og:image`, the canonical URL, and the
 * hreflang alternates are all supplied by the locale layout
 * (`app/[locale]/layout.tsx`) and inherited unchanged, so this builder never
 * strips them (setting an `openGraph` object here would drop the
 * auto-injected `og:image`).
 */
export async function buildPageMetadata(
  opts: BuildPageMetadataOptions,
): Promise<Metadata> {
  const { locale, pageId } = opts;
  const { namespace } = PAGE_SEO_BY_ID[pageId];

  const [overrides, tPage, tSite] = await Promise.all([
    getPageSeoServer(),
    getTranslations({ locale, namespace }),
    getTranslations({ locale, namespace: "Site" }),
  ]);

  const translate = (ns: string, key: string) =>
    ns === "Site" ? tSite(key) : tPage(key);

  const { title, description } = resolvePageHeading({
    pageId,
    locale: locale as Locale,
    overrides,
    translate,
  });

  return { title, description };
}
