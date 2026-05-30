import type { Locale } from "@/i18n/routing";
import { PAGE_SEO_BY_ID, type PageSeoId } from "../model/registry";
import { resolvePageSeoEntry } from "../model/resolve";
import type { PageSeoOverrides } from "../model/types";

/**
 * Looks up a translation by namespace + key. Server callers build this over
 * pre-fetched `getTranslations` instances; client callers build it over
 * `useTranslations`. Keeping the resolver agnostic of *how* translation
 * happens lets the same override-layering logic feed both `generateMetadata`
 * (meta tags) and the on-page heroes.
 */
export type Translate = (namespace: string, key: string) => string;

export interface ResolvedHeading {
  title: string;
  description: string;
}

interface ResolveArgs {
  pageId: PageSeoId;
  locale: Locale;
  overrides: PageSeoOverrides;
  translate: Translate;
}

/**
 * The description is shared by meta and the visible lede: the admin
 * override, else the page's lede paragraph, else the site-wide
 * `Site.description`.
 */
function resolveDescription(
  pageId: PageSeoId,
  override: { description?: string },
  translate: Translate,
): string {
  const page = PAGE_SEO_BY_ID[pageId];
  const fallback = page.headingDescriptionKey
    ? translate(page.namespace, page.headingDescriptionKey)
    : translate("Site", "description");
  return override.description ?? fallback;
}

/**
 * SEO meta: the `<title>` + meta description. Title default comes from the
 * page's short `titleKey` (kept under the 70-char SEO cap); override is the
 * admin's `title*` field. Used by `buildPageMetadata`.
 */
export function resolvePageMeta(args: ResolveArgs): ResolvedHeading {
  const { pageId, locale, overrides, translate } = args;
  const page = PAGE_SEO_BY_ID[pageId];
  const override = resolvePageSeoEntry(overrides[pageId], locale);
  const defaultTitle = translate(page.namespace, page.titleKey);
  return {
    title: override.title ?? defaultTitle,
    description: resolveDescription(pageId, override, translate),
  };
}

/**
 * Visible hero: the on-page H1 + lede. Heading default is rebuilt flat from
 * the hero's `headingTitleKeys` (joined by a space); override is the admin's
 * `heading*` field. Used by `usePageHeading` / `getPageHeadingServer`.
 */
export function resolvePageHeading(args: ResolveArgs): ResolvedHeading {
  const { pageId, locale, overrides, translate } = args;
  const page = PAGE_SEO_BY_ID[pageId];
  const override = resolvePageSeoEntry(overrides[pageId], locale);
  const defaultHeading = page.headingTitleKeys
    .map((key) => translate(page.namespace, key))
    .join(" ");
  return {
    title: override.heading ?? defaultHeading,
    description: resolveDescription(pageId, override, translate),
  };
}
