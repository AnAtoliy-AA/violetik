import type { MetadataRoute } from "next";

/**
 * PWA manifest. Browsers serve this at `/manifest.webmanifest`. It
 * declares the site as installable, sets the browser-chrome theme
 * colour to the Aubergine bg, and points at the SVG monogram + the
 * default favicon for installed-app surfaces.
 *
 * Locale-aware copy is overkill here — install banners and home-screen
 * icons need short stable identifiers, not translated content.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Violetta Beauty",
    short_name: "Violetta",
    description: "A private nail atelier",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#100612",
    theme_color: "#100612",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
    ],
  };
}
