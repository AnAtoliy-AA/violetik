import { readFileSync } from "fs";

/**
 * Returns `true` when the Next.js dev server will require admin auth
 * (and thus redirect /admin/* to /sign-in).
 *
 * Next.js auto-loads `.env.local`, so if `TELEGRAM_BOT_TOKEN` is set
 * there the dev server activates `requireAdmin()` — even though the
 * Playwright test runner's own `process.env` may not carry it.
 */
export function devServerRequiresAuth(): boolean {
  if (process.env.TELEGRAM_BOT_TOKEN) return true;
  try {
    return /^TELEGRAM_BOT_TOKEN=.+$/m.test(readFileSync(".env.local", "utf8"));
  } catch {
    return false;
  }
}
