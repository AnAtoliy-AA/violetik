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

  // A failed write (e.g. the `page_seo` table not yet migrated, or a
  // transient pool error) must surface as an in-form error, not an
  // unhandled 500. The read path already degrades gracefully; mirror that
  // here so the editor stays usable and the admin sees what went wrong.
  try {
    await updatePageSeo(parsed.data, updatedBy);
  } catch (error) {
    console.error("[page-seo] save failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
