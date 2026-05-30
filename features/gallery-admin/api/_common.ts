import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Mirrors the gate pattern in features/services-admin: when
 * TELEGRAM_BOT_TOKEN is unset (default CI / local dev), the admin pages
 * stay open so route-level tests work without secrets. The gate activates
 * the moment that env var lands in any environment.
 */
export async function gateAdmin(): Promise<
  | { ok: true; updatedBy: string | null }
  | { ok: false; error: string }
> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (!AUTH_REQUIRED) return { ok: true, updatedBy: null };
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.reason };
  return { ok: true, updatedBy: gate.user.id };
}

export function joinIssues(error: { issues: { message: string }[] }): string {
  return error.issues.map((i) => i.message).join("; ");
}

/**
 * Revalidate every route that renders gallery data after a mutation: the
 * customer gallery, the home teaser, and the admin gallery surfaces.
 */
export function revalidateGallery(): void {
  revalidatePath("/[locale]/gallery", "page");
  revalidatePath("/[locale]/home", "page");
  revalidatePath("/[locale]/admin/gallery", "page");
}
