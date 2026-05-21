"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  decideVipRequest,
  downgradeVipRequest,
} from "@/db/vip-requests";

export type AdminActionResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "forbidden" | "not-found" };

export interface ApproveInput {
  id: string;
  expiresAt: Date;
}

export async function approveRequest(input: ApproveInput): Promise<AdminActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideVipRequest({
    id: input.id,
    action: "approve",
    decidedBy: gate.user.id,
    expiresAt: input.expiresAt,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export interface DeclineInput {
  id: string;
  reason?: string | null;
}

export async function declineRequest(input: DeclineInput): Promise<AdminActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideVipRequest({
    id: input.id,
    action: "decline",
    decidedBy: gate.user.id,
    declineReason: input.reason ?? null,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function downgradeVip(id: string): Promise<AdminActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await downgradeVipRequest(id);
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
