"use server";

import { revalidatePath } from "next/cache";
import { siteSettingsPatchSchema } from "@/entities/site-settings";
import { requireAdmin } from "@/shared/lib/auth-server";
import { updateSiteSettings } from "@/db/site-settings";
import { invalidateDefaultLocaleCache } from "@/shared/lib/site-settings-cache";

export type UpdateSiteSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validates the patch, ensures the caller is an admin, persists, and
 * busts the proxy's locale cache so the change is visible immediately
 * on the saving instance. Other instances see it within the cache TTL.
 */
export async function updateSiteSettingsAction(
  patch: unknown,
): Promise<UpdateSiteSettingsResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  let updatedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.reason };
    updatedBy = gate.user.id;
  }

  const parsed = siteSettingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  await updateSiteSettings(parsed.data, updatedBy);
  invalidateDefaultLocaleCache();
  revalidatePath("/", "layout");
  return { ok: true };
}
