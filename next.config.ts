import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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
};

export default withNextIntl(nextConfig);
