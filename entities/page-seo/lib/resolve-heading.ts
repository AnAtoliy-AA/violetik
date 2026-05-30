import type { Locale } from "@/i18n/routing";
import { PAGE_SEO_BY_ID, type PageSeoId } from "../model/registry";
import { resolvePageSeoEntry } from "../model/resolve";
import type { PageSeoOverrides } from "../model/types";

/**
 * Looks up a translation by namespace + key. Server callers build this over
 * pre-fetched `getTranslations` instances; client callers build it over
 * `useTranslations`. Keeping the resolver agnostic of *how* translation
 * happens lets the same override-layering logic feed both `generateMetadata`
 * (meta tags) and the on-page heroes, so they always render identical copy.
 */
export type Translate = (namespace: string, key: string) => string;

export interface ResolvedHeading {
  title: string;
  description: string;
}

/**
 * Resolves a page's effective heading: the admin SEO override when present,
 * otherwise the flat translation default rebuilt from the hero's title keys
 * (joined by a space) and its lede paragraph. Pages without an editorial
 * paragraph fall back to the site-wide `Site.description`.
 *
 * Blank/whitespace overrides are treated as "no override" (see
 * `resolvePageSeoEntry`), so an empty admin field falls through to the
 * default instead of rendering an empty title.
 */
export function resolvePageHeading(args: {
  pageId: PageSeoId;
  locale: Locale;
  overrides: PageSeoOverrides;
  translate: Translate;
}): ResolvedHeading {
  const { pageId, locale, overrides, translate } = args;
  const page = PAGE_SEO_BY_ID[pageId];

  const override = resolvePageSeoEntry(overrides[pageId], locale);

  const defaultTitle = page.headingTitleKeys
    .map((key) => translate(page.namespace, key))
    .join(" ");
  const defaultDescription = page.headingDescriptionKey
    ? translate(page.namespace, page.headingDescriptionKey)
    : translate("Site", "description");

  return {
    title: override.title ?? defaultTitle,
    description: override.description ?? defaultDescription,
  };
}
