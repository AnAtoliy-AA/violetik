import { randomBytes } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { db, schema } from "./index";

export function generateVipRequestId(): string {
  return `vipreq_${randomBytes(8).toString("hex")}`;
}

export interface NewVipRequestInput {
  userId: string;
  note?: string | null;
}

export async function createVipRequest(
  input: NewVipRequestInput,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const id = generateVipRequestId();
  const rows = await db
    .insert(schema.vipRequests)
    .values({
      id,
      userId: input.userId,
      note: input.note ?? null,
    })
    .returning();
  return rows[0] ?? null;
}

export async function cancelOwnVipRequest(
  userId: string,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .update(schema.vipRequests)
    .set({ status: "cancelled", decidedAt: now, decidedBy: userId })
    .where(
      and(
        eq(schema.vipRequests.userId, userId),
        eq(schema.vipRequests.status, "pending"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export type DecideVipRequestInput =
  | {
      id: string;
      action: "approve";
      decidedBy: string;
      expiresAt: Date;
    }
  | {
      id: string;
      action: "decline";
      decidedBy: string;
      declineReason?: string | null;
    };

export async function decideVipRequest(
  input: DecideVipRequestInput,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const base = {
    decidedAt: now,
    decidedBy: input.decidedBy,
  };
  const patch =
    input.action === "approve"
      ? { ...base, status: "approved" as const, expiresAt: input.expiresAt }
      : {
          ...base,
          status: "declined" as const,
          declineReason: input.declineReason ?? null,
        };
  const rows = await db
    .update(schema.vipRequests)
    .set(patch)
    .where(
      and(
        eq(schema.vipRequests.id, input.id),
        eq(schema.vipRequests.status, "pending"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export async function downgradeVipRequest(
  id: string,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .update(schema.vipRequests)
    .set({ expiresAt: now })
    .where(
      and(
        eq(schema.vipRequests.id, id),
        eq(schema.vipRequests.status, "approved"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export type CurrentTier =
  | { state: "member" }
  | { state: "member-pending"; pendingRequestId: string }
  | { state: "vip"; activeRequestId: string; expiresAt: Date };

export async function getCurrentTier(userId: string): Promise<CurrentTier> {
  if (!db) return { state: "member" };
  const rows = await db
    .select()
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.userId, userId),
        or(
          eq(schema.vipRequests.status, "pending"),
          eq(schema.vipRequests.status, "approved"),
        ),
      ),
    )
    .orderBy(desc(schema.vipRequests.createdAt));

  const now = new Date();
  const activeVip = rows.find(
    (r) =>
      r.status === "approved" &&
      r.expiresAt !== null &&
      r.expiresAt > now,
  );
  if (activeVip) {
    return {
      state: "vip",
      activeRequestId: activeVip.id,
      expiresAt: activeVip.expiresAt!,
    };
  }
  const pending = rows.find((r) => r.status === "pending");
  if (pending) {
    return { state: "member-pending", pendingRequestId: pending.id };
  }
  return { state: "member" };
}
