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

  let services: { id: string; updatedAt: Date | null }[] = [];
  try {
    services = await listPublishedServices();
  } catch {
    // DB unavailable at build time (e.g. Vercel) — omit dynamic service paths
  }

  const now = new Date();

  const staticEntries = routing.locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "/welcome" || path === "/home" ? 0.9 : 0.7,
    })),
  );

  const serviceEntries = routing.locales.flatMap((locale) =>
    services.map((s) => ({
      url: `${base}/${locale}/services/${s.id}`,
      lastModified: s.updatedAt ?? now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return [...staticEntries, ...serviceEntries];
}
