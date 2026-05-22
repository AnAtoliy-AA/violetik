import { requireAdmin } from "@/shared/lib/auth-server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; error: string; blockingCount: number };

/**
 * Mirrors features/services-admin/api/_common.ts. When
 * TELEGRAM_BOT_TOKEN is unset the admin pages stay open so route-level
 * tests work without secrets; once the token lands, requireAdmin gates
 * the call.
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
