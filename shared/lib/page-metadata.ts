import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, LOCALE_TO_LANG, type Locale } from "@/i18n/routing";
import { resolvePageSeo, type PageSeoId } from "@/entities/page-seo";
import { getPageSeoServer } from "./page-seo-server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://violetta.example.com";

const OG_LOCALE: Record<string, string> = {
  en: "en_US",
  ru: "ru_RU",
  by: "be_BY",
};

export interface BuildPageMetadataOptions {
  locale: string;
  /** Page id from PAGE_SEO_PAGES — the override lookup key. */
  pageId: PageSeoId;
  /** Route path, e.g. "/home" — used for canonical + hreflang URLs. */
  path: string;
  /** Title used when no admin override exists for this locale. */
  fallbackTitle: string;
  /**
   * Description used when no admin override exists for this locale.
   * Defaults to the site-wide description (`Site.description`).
   */
  fallbackDescription?: string;
}

/**
 * Builds a page's `Metadata`, layering an admin SEO override (from the
 * `page_seo` table) over the translation default. Always emits a
 * per-page canonical URL, hreflang alternates, and OpenGraph/Twitter
 * cards so each route is fully addressable for crawlers — previously
 * pages only set a bare `title` and inherited the rest from the layout.
 */
export async function buildPageMetadata(
  opts: BuildPageMetadataOptions,
): Promise<Metadata> {
  const { locale, pageId, path, fallbackTitle } = opts;
  const typedLocale = locale as Locale;

  const [overrides, tSite] = await Promise.all([
    getPageSeoServer(),
    getTranslations({ locale, namespace: "Site" }),
  ]);

  const override = resolvePageSeo(overrides, pageId, typedLocale);
  const title = override.title ?? fallbackTitle;
  const description =
    override.description ?? opts.fallbackDescription ?? tSite("description");
  const url = `${SITE_URL}/${locale}${path}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: tSite("name"),
      locale: OG_LOCALE[locale] ?? OG_LOCALE.en,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((l) => [LOCALE_TO_LANG[l], `${SITE_URL}/${l}${path}`]),
      ),
    },
  };
}
