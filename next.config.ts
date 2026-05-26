import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// @serwist/turbopack is the Next 16/Turbopack-compatible variant. It
// emits the compiled service worker via a route handler in
// app/serwist/[path]/route.ts; the bundle lands at /serwist/sw.js
// rather than /sw.js.

const nextConfig: NextConfig = {
  // Next.js 16 blocks cross-origin dev requests by default. Allow the
  // common dev hosts so the page can be opened on either `localhost`
  // or `127.0.0.1` (Telegram's `/setdomain` sometimes only accepts IPs).
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // React's <ViewTransition> integrates with the browser's View
  // Transitions API to morph shared elements across navigation. Browsers
  // without support fall back to instant nav — progressive enhancement.
  experimental: {
    viewTransition: true,
  },
  // Allow next/image to optimize photographs served from Vercel Blob.
  // The wildcard matches both `<store>.public.blob.vercel-storage.com` and
  // `<store>.<region>.public.blob.vercel-storage.com` per Blob's CDN layout.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default withSerwist(withNextIntl(nextConfig));

