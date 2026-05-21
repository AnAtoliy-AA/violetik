import "server-only";
import { getSiteSettings } from "@/db/site-settings";
import type { Locale } from "@/i18n/routing";

/**
 * Module-level TTL cache for the proxy's default-locale read.
 *
 * Why a separate cache from `getSiteSettingsServer`: React's
 * `cache()` only memoizes within a single render, and the Next.js 16
 * proxy doc explicitly says `next.tags` / `next.revalidate` have no
 * effect inside proxy. A tiny TTL cache here avoids a DB hit on
 * every request without giving up the freshness guarantee — admin
 * changes propagate within at most TTL_MS, and the save action
 * also calls `invalidateDefaultLocaleCache()` to refresh the
 * saving instance immediately.
 */
let cached: { value: Locale; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function getCachedDefaultLocale(): Promise<Locale> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  const settings = await getSiteSettings();
  cached = { value: settings.defaultLocale, expiresAt: now + TTL_MS };
  return cached.value;
}

export function invalidateDefaultLocaleCache(): void {
  cached = null;
}
