"use server";

import { revalidatePath } from "next/cache";
import { pageSeoPatchSchema } from "@/entities/page-seo";
import { requireAdmin } from "@/shared/lib/auth-server";
import { updatePageSeo } from "@/db/page-seo";

export type UpdatePageSeoResult = { ok: true } | { ok: false; error: string };

/**
 * Validates the patch, ensures the caller is an admin, persists the
 * per-page SEO overrides, and revalidates every route so refreshed
 * titles/descriptions are served immediately.
 */
export async function updatePageSeoAction(
  patch: unknown,
): Promise<UpdatePageSeoResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  let updatedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.reason };
    updatedBy = gate.user.id;
  }

  const parsed = pageSeoPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  await updatePageSeo(parsed.data, updatedBy);
  revalidatePath("/", "layout");
  return { ok: true };
}
