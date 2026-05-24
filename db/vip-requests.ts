import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

// Admin SSR budget — same rationale as db/site-settings.ts.
const ADMIN_READ_TIMEOUT_MS = 5_000;

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
  | { state: "vip"; activeRequestId: string; expiresAt: Date | null };

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
      (r.expiresAt === null || r.expiresAt > now),
  );
  if (activeVip) {
    return {
      state: "vip",
      activeRequestId: activeVip.id,
      expiresAt: activeVip.expiresAt,
    };
  }
  const pending = rows.find((r) => r.status === "pending");
  if (pending) {
    return { state: "member-pending", pendingRequestId: pending.id };
  }
  return { state: "member" };
}

export interface VipRequestWithUser extends schema.VipRequest {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
}

const userJoinColumns = {
  userEmail: schema.users.email,
  userFirstName: schema.users.firstName,
  userLastName: schema.users.lastName,
  username: schema.users.username,
};

function withUserShape(
  row: {
    request: schema.VipRequest;
    userEmail: string | null;
    userFirstName: string | null;
    userLastName: string | null;
    username: string | null;
  },
): VipRequestWithUser {
  return {
    ...row.request,
    userEmail: row.userEmail,
    userFirstName: row.userFirstName,
    userLastName: row.userLastName,
    username: row.username,
  };
}

export async function listPendingVipRequests(): Promise<VipRequestWithUser[]> {
  if (!db) return [];
  try {
    const rows = await withQueryTimeout(
      db
        .select({ request: schema.vipRequests, ...userJoinColumns })
        .from(schema.vipRequests)
        .leftJoin(schema.users, eq(schema.vipRequests.userId, schema.users.id))
        .where(eq(schema.vipRequests.status, "pending"))
        .orderBy(desc(schema.vipRequests.createdAt)),
      ADMIN_READ_TIMEOUT_MS,
      "vip_requests.listPending",
    );
    return rows.map(withUserShape);
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/vip-requests] listPendingVipRequests timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export async function listActiveVips(): Promise<VipRequestWithUser[]> {
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({ request: schema.vipRequests, ...userJoinColumns })
    .from(schema.vipRequests)
    .leftJoin(schema.users, eq(schema.vipRequests.userId, schema.users.id))
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          gt(schema.vipRequests.expiresAt, now),
        ),
      ),
    )
    .orderBy(sql`${schema.vipRequests.expiresAt} ASC NULLS LAST`);
  return rows.map(withUserShape);
}

export async function listExpiredVipRequests(opts: {
  limit: number;
  offset: number;
}): Promise<VipRequestWithUser[]> {
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({ request: schema.vipRequests, ...userJoinColumns })
    .from(schema.vipRequests)
    .leftJoin(schema.users, eq(schema.vipRequests.userId, schema.users.id))
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        lte(schema.vipRequests.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.vipRequests.expiresAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return rows.map(withUserShape);
}

export async function countExpiredVipRequests(): Promise<number> {
  if (!db) return 0;
  const now = new Date();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        lte(schema.vipRequests.expiresAt, now),
      ),
    );
  return rows[0]?.n ?? 0;
}
