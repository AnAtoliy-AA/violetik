"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import {
  cancelOwnVipRequest,
  createVipRequest,
  getCurrentTier,
} from "@/db/vip-requests";
import { listAdminUserIds } from "@/db/users-admin";
import { dispatchNotification } from "@/shared/lib/notifications";
import { rateLimit } from "@/shared/lib/security/rate-limit";

export interface SubmitVipRequestInput {
  note?: string | null;
}

// Cap the free-text note to stop oversized/spam payloads. Empty/whitespace
// collapses to null so the column stays clean.
const noteSchema = z
  .string()
  .trim()
  .max(500)
  .transform((s) => (s.length === 0 ? null : s))
  .nullable()
  .optional();

// Per-user cap — a customer never needs to fire VIP requests rapidly.
const RATE_LIMIT = { limit: 3, windowMs: 60 * 60_000 };

export type SubmitVipRequestResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "invalid-input" }
  | { ok: false; reason: "rate-limited" }
  | { ok: false; reason: "pending-exists"; id: string }
  | { ok: false; reason: "already-vip"; expiresAt: Date | null }
  | { ok: false; reason: "db-unavailable" };

export async function submitVipRequest(
  input: SubmitVipRequestInput,
): Promise<SubmitVipRequestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsedNote = noteSchema.safeParse(input.note);
  if (!parsedNote.success) return { ok: false, reason: "invalid-input" };

  if (!rateLimit(`vip:${session.user.id}`, RATE_LIMIT).ok) {
    return { ok: false, reason: "rate-limited" };
  }

  const current = await getCurrentTier(session.user.id);
  if (current.state === "member-pending") {
    return { ok: false, reason: "pending-exists", id: current.pendingRequestId };
  }
  if (current.state === "vip") {
    return { ok: false, reason: "already-vip", expiresAt: current.expiresAt };
  }

  const row = await createVipRequest({
    userId: session.user.id,
    note: parsedNote.data ?? null,
  });
  if (!row) return { ok: false, reason: "db-unavailable" };

  const adminIds = await listAdminUserIds();
  for (const adminId of adminIds) {
    await dispatchNotification(adminId, "vip_request_submitted", {
      titleKey: "category_vip_request_submitted_push_title",
      bodyKey: "category_vip_request_submitted_push_body",
      bodyParams: { customer: session.user.name ?? session.user.id },
      url: "/admin/vip-requests",
      meta: { vipRequestId: row.id },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export type CancelVipRequestResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "no-pending" };

export async function cancelVipRequest(): Promise<CancelVipRequestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };

  const row = await cancelOwnVipRequest(session.user.id);
  if (!row) return { ok: false, reason: "no-pending" };

  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
