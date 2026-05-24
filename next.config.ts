import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Compiles `app/sw.ts` → `public/sw.js`. Disabled in dev so HMR isn't
// poisoned by cached chunks; in prod the service worker takes over
// caching + push/notificationclick handling.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

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
