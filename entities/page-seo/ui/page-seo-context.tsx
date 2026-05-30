"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { resolvePageHeading, type ResolvedHeading } from "../lib/resolve-heading";
import { PAGE_SEO_BY_ID, type PageSeoId } from "../model/registry";
import type { PageSeoOverrides } from "../model/types";

/**
 * Carries the admin SEO overrides (one DB read, done in the locale layout)
 * down to every client hero so they can render the same title/description
 * the meta tags use. Defaults to an empty map, so a hero used outside the
 * provider (e.g. Storybook) just shows its translation defaults.
 */
const PageSeoContext = createContext<PageSeoOverrides>({});

export function PageSeoProvider({
  overrides,
  children,
}: {
  overrides: PageSeoOverrides;
  children: ReactNode;
}) {
  return (
    <PageSeoContext value={overrides}>{children}</PageSeoContext>
  );
}

/**
 * The on-page counterpart to `buildPageMetadata`: returns the flat title +
 * description a hero should render — admin override when set, else the
 * translation default. Reads the overrides from context and the defaults
 * from next-intl, so the visible copy stays in lockstep with the meta tags.
 */
export function usePageHeading(pageId: PageSeoId): ResolvedHeading {
  const overrides = useContext(PageSeoContext);
  const locale = useLocale() as Locale;
  const page = PAGE_SEO_BY_ID[pageId];
  const tPage = useTranslations(page.namespace);
  const tSite = useTranslations("Site");

  const translate = (namespace: string, key: string) =>
    namespace === "Site" ? tSite(key) : tPage(key);

  return resolvePageHeading({ pageId, locale, overrides, translate });
}
