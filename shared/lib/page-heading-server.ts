import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  PAGE_SEO_BY_ID,
  resolvePageHeading,
  type PageSeoId,
  type ResolvedHeading,
} from "@/entities/page-seo";
import { getPageSeoServer } from "./page-seo-server";

/**
 * Server-component counterpart to `usePageHeading`. Returns the flat title +
 * description a server-rendered hero should show — admin override when set,
 * else the translation default — using the same resolver that feeds
 * `buildPageMetadata`, so meta tags and visible copy stay identical.
 */
export async function getPageHeadingServer(
  pageId: PageSeoId,
  locale: string,
): Promise<ResolvedHeading> {
  const { namespace } = PAGE_SEO_BY_ID[pageId];
  const [overrides, tPage, tSite] = await Promise.all([
    getPageSeoServer(),
    getTranslations({ locale, namespace }),
    getTranslations({ locale, namespace: "Site" }),
  ]);
  const translate = (ns: string, key: string) =>
    ns === "Site" ? tSite(key) : tPage(key);
  return resolvePageHeading({
    pageId,
    locale: locale as Locale,
    overrides,
    translate,
  });
}
