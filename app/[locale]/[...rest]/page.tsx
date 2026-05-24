import { notFound } from "next/navigation";

/**
 * Catch-all that runs only when nothing else matched under `[locale]/`.
 * Calling `notFound()` forces Next.js to render
 * `app/[locale]/not-found.tsx` — the editorial 404 — with the locale
 * layout (palette, fonts, NextIntlClientProvider) still in scope.
 *
 * Without this, an unmatched URL like `/en/anything` would fall through
 * to the framework's default 404, skipping our design.
 */
export default function NotFoundCatchAll(): never {
  notFound();
}
