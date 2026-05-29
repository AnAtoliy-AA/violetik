import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Same gate posture as features/services-admin (open without a token). */
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

export function revalidateOnboarding(): void {
  revalidatePath("/[locale]/onboarding", "page");
  revalidatePath("/[locale]/admin/onboarding", "page");
}
