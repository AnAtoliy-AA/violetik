import type { MetadataRoute } from "next";
import { listPublishedServices } from "@/db/services";
import { routing } from "@/i18n/routing";

/**
 * Public sitemap. Enumerates every public route × every locale.
 *
 * Excluded by design: `/admin` (private), `/booking/*` (transactional —
 * not crawl-worthy), and the implicit `/[locale]` redirect (it forwards
 * to `/welcome`, so we list `/welcome` directly).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://violetta.example.com";

  const PUBLIC_PATHS = [
    "/welcome",
    "/onboarding",
    "/home",
    "/services",
    "/gallery",
    "/master",
    "/membership",
    "/profile",
  ] as const;

  let services: { id: string }[] = [];
  try {
    services = await listPublishedServices();
  } catch {
    // DB unavailable at build time (e.g. Vercel) — omit dynamic service paths
  }
  const servicePaths = services.map((s) => `/services/${s.id}`);
  const allPaths = [...PUBLIC_PATHS, ...servicePaths];

  return routing.locales.flatMap((locale) =>
    allPaths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "/welcome" || path === "/home" ? 0.9 : 0.7,
    })),
  );
}
