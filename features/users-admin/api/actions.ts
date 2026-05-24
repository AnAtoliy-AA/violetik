"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  setUserRole,
  setAdminNote,
  grantVip,
  revokeVip,
  mergeUsers,
  type OverrideSource,
  type MergeConflicts,
} from "@/db/users-admin";

type AuthFail = { ok: false; reason: "unauthorized" | "forbidden" };

export type SetRoleActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "last-admin" | "not-found" };

export async function setUserRoleAction(
  id: string,
  role: "customer" | "admin",
): Promise<SetRoleActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const result = await setUserRole(id, role);
  if (!result.ok) return { ok: false, reason: result.reason };
  revalidatePath("/", "layout");
  return { ok: true, id: result.user.id };
}

export type SetNoteActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "not-found" };

export async function setAdminNoteAction(
  id: string,
  note: string | null,
): Promise<SetNoteActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const user = await setAdminNote(id, note);
  if (!user) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: user.id };
}

export type GrantVipActionInput = {
  userId: string;
  expiresAt: Date | null;
};

export type GrantVipActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "not-found" };

export async function grantVipAction(
  input: GrantVipActionInput,
): Promise<GrantVipActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await grantVip({
    userId: input.userId,
    expiresAt: input.expiresAt,
    decidedBy: gate.user.id,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export type RevokeVipActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "not-found" };

export async function revokeVipAction(
  userId: string,
): Promise<RevokeVipActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await revokeVip(userId);
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export type MergeActionInput = {
  survivorId: string;
  loserId: string;
  overrides: {
    firstName: OverrideSource;
    lastName: OverrideSource;
    email: OverrideSource;
    photoUrl: OverrideSource;
  };
};

export type MergeActionResult =
  | { ok: true; survivorId: string }
  | AuthFail
  | {
      ok: false;
      reason: "not-found" | "conflicts";
      conflicts?: MergeConflicts;
    };

export async function mergeUsersAction(
  input: MergeActionInput,
): Promise<MergeActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const result = await mergeUsers({
    ...input,
    auditByAdmin: gate.user.id,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason, conflicts: result.conflicts };
  }
  revalidatePath("/", "layout");
  return { ok: true, survivorId: result.survivorId };
}
