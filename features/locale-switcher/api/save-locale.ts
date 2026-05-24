"use server";

import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { setUserPreferredLocale } from "@/db/users";
import { routing } from "@/i18n/routing";

export type SaveLocaleResult = { ok: boolean };

/**
 * Fire-and-forget locale-preference write. Validates the locale is
 * one of the supported set, then updates `users.preferred_locale`.
 * Guests are no-op'd silently — only signed-in users have a row to
 * update.
 */
export async function saveLocalePreferenceAction(
  locale: string,
): Promise<SaveLocaleResult> {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { ok: false };
  }
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false };
  await setUserPreferredLocale(user.id, locale);
  return { ok: true };
}
