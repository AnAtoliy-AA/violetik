import { cache } from "react";
import { getSiteSettings } from "@/db/site-settings";
import { withDevTimeout } from "@/db/dev-timeout";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";

/**
 * The single SSR entry point for reading site settings.
 *
 * React's `cache()` memoizes within one server render so layout +
 * generateMetadata + nested pages + Suspense children all share a
 * single DB hit per request. The `withDevTimeout` wrap gives every
 * caller the dev-mode safety net (stuck-pool detection + retry on a
 * fresh pool) without each call site having to wrap independently —
 * which historically led to `views/profile/api/loaders.ts` defining
 * its *own* React.cache for site settings, doubling the query count
 * per `/profile` request and turning `profile.siteSettings` into the
 * pool-poisoning canary.
 *
 * Wrapped in try/catch so that a dev-mode hard-timeout (after retry
 * also fails) degrades to defaults instead of crashing the layout.
 * `getSiteSettings()` already returns defaults on inner DB errors
 * (missing table, etc.) so the only path through this catch is the
 * `withDevTimeout` final reject — and at that point the page can't
 * render real settings anyway, defaults are the right fallback.
 * No-op in production: `withDevTimeout` is a passthrough and
 * `getSiteSettings` is the same function it always was.
 */
export const getSiteSettingsServer = cache(async () => {
  try {
    return await withDevTimeout(() => getSiteSettings(), "site.settings");
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
});
