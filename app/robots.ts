import type { MetadataRoute } from "next";

/**
 * robots.txt. Crawlers may index the public site freely but stay out of
 * the admin route and the booking flow.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://violetta.example.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/*/admin", "/booking", "/*/booking"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
