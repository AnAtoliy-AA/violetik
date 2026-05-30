import { cache } from "react";
import { getAllPageSeo } from "@/db/page-seo";
import { withDevTimeout } from "@/db/dev-timeout";
import type { PageSeoOverrides } from "@/entities/page-seo";

/**
 * The single SSR entry point for reading per-page SEO overrides.
 *
 * React's `cache()` memoizes within one server render, so multiple
 * `generateMetadata` calls in a single request (layout + page) share a
 * single DB hit. Mirrors `getSiteSettingsServer` — `withDevTimeout`
 * gives the dev-mode stuck-pool safety net, and a final failure degrades
 * to "no overrides" (translation defaults) rather than crashing.
 */
export const getPageSeoServer = cache(async (): Promise<PageSeoOverrides> => {
  try {
    return await withDevTimeout(() => getAllPageSeo(), "page.seo");
  } catch {
    return {};
  }
});
