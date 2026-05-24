import { randomBytes } from "node:crypto";
import {
  and,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

// Admin SSR budget — same rationale as db/site-settings.ts.
const ADMIN_READ_TIMEOUT_MS = 5_000;

export const USERS_PAGE_SIZE = 20;

export type RoleFilter = "all" | "admin" | "customer";
export type VipFilter = "all" | "active" | "none";

export interface ListUsersInput {
  q: string;
  role: RoleFilter;
  vip: VipFilter;
  page: number;
}

export interface UserListRow {
  id: string;
  telegramId: number | null;
  googleSub: string | null;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  role: "customer" | "admin";
  createdAt: Date;
  lastSignInAt: Date | null;
  adminNote: string | null;
  vipState: "none" | "active" | "lifetime";
  vipExpiresAt: Date | null;
}

function buildBaseFilters(input: Pick<ListUsersInput, "q" | "role">) {
  const filters: Array<ReturnType<typeof eq>> = [];
  if (input.role !== "all") {
    filters.push(eq(schema.users.role, input.role));
  }
  const q = input.q.trim();
  if (q) {
    const pattern = `%${q}%`;
    const search = or(
      ilike(schema.users.id, pattern),
      ilike(schema.users.email, pattern),
      ilike(schema.users.firstName, pattern),
      ilike(schema.users.lastName, pattern),
      ilike(schema.users.username, pattern),
    );
    if (search) filters.push(search);
  }
  return filters;
}

export async function listUsers(input: ListUsersInput): Promise<UserListRow[]> {
  if (!db) return [];
  const now = new Date();
  const page = Math.max(1, Math.floor(input.page));
  const offset = (page - 1) * USERS_PAGE_SIZE;

  const activeVip = db
    .select({
      userId: schema.vipRequests.userId,
      id: schema.vipRequests.id,
      expiresAt: schema.vipRequests.expiresAt,
    })
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          gt(schema.vipRequests.expiresAt, now),
        ),
      ),
    )
    .as("active_vip");

  const baseFilters = buildBaseFilters({ q: input.q, role: input.role });
  if (input.vip === "active") {
    baseFilters.push(isNotNull(activeVip.userId));
  } else if (input.vip === "none") {
    baseFilters.push(isNull(activeVip.userId));
  }

  try {
    const rows = await withQueryTimeout(
      db
        .select({
          user: schema.users,
          vipUserId: activeVip.userId,
          vipExpiresAt: activeVip.expiresAt,
        })
        .from(schema.users)
        .leftJoin(activeVip, eq(activeVip.userId, schema.users.id))
        .where(baseFilters.length ? and(...baseFilters) : undefined)
        .orderBy(desc(schema.users.lastSignInAt), desc(schema.users.createdAt))
        .limit(USERS_PAGE_SIZE)
        .offset(offset),
      ADMIN_READ_TIMEOUT_MS,
      "users.list",
    );

    return rows.map((r) => ({
      id: r.user.id,
      telegramId: r.user.telegramId,
      googleSub: r.user.googleSub,
      email: r.user.email,
      username: r.user.username,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      photoUrl: r.user.photoUrl,
      role: r.user.role,
      createdAt: r.user.createdAt,
      lastSignInAt: r.user.lastSignInAt,
      adminNote: r.user.adminNote,
      vipState: !r.vipUserId
        ? "none"
        : r.vipExpiresAt === null
          ? "lifetime"
          : "active",
      vipExpiresAt: r.vipExpiresAt,
    }));
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/users-admin] listUsers timed out:", error.message);
      return [];
    }
    throw error;
  }
}

export async function countUsers(
  input: Omit<ListUsersInput, "page">,
): Promise<number> {
  if (!db) return 0;
  const now = new Date();

  const activeVip = db
    .select({ userId: schema.vipRequests.userId })
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          gt(schema.vipRequests.expiresAt, now),
        ),
      ),
    )
    .as("active_vip");

  const baseFilters = buildBaseFilters({ q: input.q, role: input.role });
  if (input.vip === "active") baseFilters.push(isNotNull(activeVip.userId));
  if (input.vip === "none") baseFilters.push(isNull(activeVip.userId));

  try {
    const rows = await withQueryTimeout(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.users)
        .leftJoin(activeVip, eq(activeVip.userId, schema.users.id))
        .where(baseFilters.length ? and(...baseFilters) : undefined),
      ADMIN_READ_TIMEOUT_MS,
      "users.count",
    );
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/users-admin] countUsers timed out:", error.message);
      return 0;
    }
    throw error;
  }
}

export interface UserDetail extends UserListRow {
  bookingCount: number;
  testimonialPendingCount: number;
  testimonialApprovedCount: number;
  pendingVipRequestId: string | null;
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  if (!db) return null;

  try {
    const userRow = await withQueryTimeout(
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1),
      ADMIN_READ_TIMEOUT_MS,
      "users.getDetail.user",
    );
    const user = userRow[0];
    if (!user) return null;

    const now = new Date();

    const [bookingRows, pendingRow, approvedRow, activeRow, pendingVipRow] =
      await withQueryTimeout(
        Promise.all([
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(schema.bookings)
            .where(eq(schema.bookings.userId, id)),
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(schema.testimonials)
            .where(
              and(
                eq(schema.testimonials.userId, id),
                eq(schema.testimonials.status, "pending"),
              ),
            ),
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(schema.testimonials)
            .where(
              and(
                eq(schema.testimonials.userId, id),
                eq(schema.testimonials.status, "approved"),
              ),
            ),
          db
            .select({
              id: schema.vipRequests.id,
              expiresAt: schema.vipRequests.expiresAt,
            })
            .from(schema.vipRequests)
            .where(
              and(
                eq(schema.vipRequests.userId, id),
                eq(schema.vipRequests.status, "approved"),
                or(
                  isNull(schema.vipRequests.expiresAt),
                  gt(schema.vipRequests.expiresAt, now),
                ),
              ),
            )
            .limit(1),
          db
            .select({ id: schema.vipRequests.id })
            .from(schema.vipRequests)
            .where(
              and(
                eq(schema.vipRequests.userId, id),
                eq(schema.vipRequests.status, "pending"),
              ),
            )
            .limit(1),
        ]),
        ADMIN_READ_TIMEOUT_MS,
        "users.getDetail.aggregates",
      );

    const active = activeRow[0];

    return {
      id: user.id,
      telegramId: user.telegramId,
      googleSub: user.googleSub,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      role: user.role,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      adminNote: user.adminNote,
      vipState: !active
        ? "none"
        : active.expiresAt === null
          ? "lifetime"
          : "active",
      vipExpiresAt: active?.expiresAt ?? null,
      bookingCount: bookingRows[0]?.n ?? 0,
      testimonialPendingCount: pendingRow[0]?.n ?? 0,
      testimonialApprovedCount: approvedRow[0]?.n ?? 0,
      pendingVipRequestId: pendingVipRow[0]?.id ?? null,
    };
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/users-admin] getUserDetail timed out:", error.message);
      return null;
    }
    throw error;
  }
}

export type SetUserRoleResult =
  | { ok: true; user: schema.User }
  | { ok: false; reason: "last-admin" | "not-found" };

export async function setUserRole(
  id: string,
  role: "customer" | "admin",
): Promise<SetUserRoleResult> {
  if (!db) return { ok: false, reason: "not-found" };

  if (role === "customer") {
    const currentRows = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    const current = currentRows[0]?.role;
    if (current === "admin") {
      const counts = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));
      if ((counts[0]?.n ?? 0) <= 1) return { ok: false, reason: "last-admin" };
    }
  }

  const rows = await db
    .update(schema.users)
    .set({ role })
    .where(eq(schema.users.id, id))
    .returning();
  const user = rows[0];
  if (!user) return { ok: false, reason: "not-found" };
  return { ok: true, user };
}

export async function setAdminNote(
  id: string,
  note: string | null,
): Promise<schema.User | null> {
  if (!db) return null;
  const trimmed = note === null ? null : note.trim() === "" ? null : note;
  const rows = await db
    .update(schema.users)
    .set({ adminNote: trimmed })
    .where(eq(schema.users.id, id))
    .returning();
  return rows[0] ?? null;
}

export interface GrantVipInput {
  userId: string;
  expiresAt: Date | null;
  decidedBy: string;
}

export async function grantVip(
  input: GrantVipInput,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const newId = `vipreq_${randomBytes(8).toString("hex")}`;

  return await db.transaction(async (tx) => {
    await tx
      .update(schema.vipRequests)
      .set({ status: "cancelled", decidedAt: now, decidedBy: input.decidedBy })
      .where(
        and(
          eq(schema.vipRequests.userId, input.userId),
          eq(schema.vipRequests.status, "pending"),
        ),
      );

    const rows = await tx
      .insert(schema.vipRequests)
      .values({
        id: newId,
        userId: input.userId,
        status: "approved",
        decidedAt: now,
        decidedBy: input.decidedBy,
        expiresAt: input.expiresAt,
      })
      .returning();
    return rows[0] ?? null;
  });
}

export async function revokeVip(
  userId: string,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .update(schema.vipRequests)
    .set({ expiresAt: now })
    .where(
      and(
        eq(schema.vipRequests.userId, userId),
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          gt(schema.vipRequests.expiresAt, now),
        ),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export type MergeSignal = "email" | "photo" | "name" | "tg-google-handle";

export interface MergeCandidate {
  a: schema.User;
  b: schema.User;
  score: number;
  signals: MergeSignal[];
}

export type SuggestMergeInput =
  | { scope: "all" }
  | { scope: "for"; userId: string };

const SIGNAL_WEIGHT: Record<MergeSignal, number> = {
  email: 4,
  photo: 3,
  name: 2,
  "tg-google-handle": 1,
};

const SIGNAL_THRESHOLD = 2;
const SITEWIDE_CAP = 50;

export async function suggestMergeCandidates(
  input: SuggestMergeInput,
): Promise<MergeCandidate[]> {
  if (!db) return [];

  let users: schema.User[];
  try {
    users = await withQueryTimeout(
      db.select().from(schema.users),
      ADMIN_READ_TIMEOUT_MS,
      "users.suggestMergeCandidates",
    );
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/users-admin] suggestMergeCandidates timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }

  const tg = users.filter((u) => u.id.startsWith("tg:"));
  const google = users.filter((u) => u.id.startsWith("google:"));

  const candidates: MergeCandidate[] = [];

  for (const t of tg) {
    for (const g of google) {
      if (
        input.scope === "for" &&
        t.id !== input.userId &&
        g.id !== input.userId
      ) {
        continue;
      }

      const signals: MergeSignal[] = [];
      const tEmail = t.email?.trim().toLowerCase();
      const gEmail = g.email?.trim().toLowerCase();
      if (tEmail && gEmail && tEmail === gEmail) signals.push("email");
      if (t.photoUrl && g.photoUrl && t.photoUrl === g.photoUrl) {
        signals.push("photo");
      }
      const tFirst = t.firstName?.toLowerCase();
      const tLast = t.lastName?.toLowerCase();
      const gFirst = g.firstName?.toLowerCase();
      const gLast = g.lastName?.toLowerCase();
      if (tFirst && tLast && tFirst === gFirst && tLast === gLast) {
        signals.push("name");
      }
      const tUsername = t.username?.toLowerCase();
      const gLocal = gEmail?.split("@")[0];
      if (tUsername && gLocal && tUsername === gLocal) {
        signals.push("tg-google-handle");
      }

      const score = signals.reduce((s, sig) => s + SIGNAL_WEIGHT[sig], 0);
      if (score < SIGNAL_THRESHOLD) continue;

      const [a, b] = t.id < g.id ? [t, g] : [g, t];
      candidates.push({ a, b, score, signals });
    }
  }

  candidates.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    const lx = Math.max(
      x.a.lastSignInAt?.getTime() ?? 0,
      x.b.lastSignInAt?.getTime() ?? 0,
    );
    const ly = Math.max(
      y.a.lastSignInAt?.getTime() ?? 0,
      y.b.lastSignInAt?.getTime() ?? 0,
    );
    return ly - lx;
  });

  if (input.scope === "all") return candidates.slice(0, SITEWIDE_CAP);
  return candidates;
}

export interface MergeConflicts {
  bothPendingVip: boolean;
  pendingTestimonialCollisions: string[];
}

export async function getMergeConflicts(
  idA: string,
  idB: string,
): Promise<MergeConflicts> {
  if (!db) {
    return { bothPendingVip: false, pendingTestimonialCollisions: [] };
  }

  let vipRows: Array<{ userId: string }>;
  let testimonialRows: Array<{ userId: string; masterId: string }>;
  try {
    [vipRows, testimonialRows] = await withQueryTimeout(
      Promise.all([
        db
          .select({ userId: schema.vipRequests.userId })
          .from(schema.vipRequests)
          .where(
            and(
              eq(schema.vipRequests.status, "pending"),
              inArray(schema.vipRequests.userId, [idA, idB]),
            ),
          ),
        db
          .select({
            userId: schema.testimonials.userId,
            masterId: schema.testimonials.masterId,
          })
          .from(schema.testimonials)
          .where(
            and(
              eq(schema.testimonials.status, "pending"),
              inArray(schema.testimonials.userId, [idA, idB]),
            ),
          ),
      ]),
      ADMIN_READ_TIMEOUT_MS,
      "users.getMergeConflicts",
    );
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/users-admin] getMergeConflicts timed out:",
        error.message,
      );
      return { bothPendingVip: false, pendingTestimonialCollisions: [] };
    }
    throw error;
  }

  const pendingUsers = new Set(vipRows.map((r) => r.userId));
  const bothPendingVip = pendingUsers.has(idA) && pendingUsers.has(idB);

  const byMaster = new Map<string, Set<string>>();
  for (const t of testimonialRows) {
    if (!byMaster.has(t.masterId)) byMaster.set(t.masterId, new Set());
    byMaster.get(t.masterId)!.add(t.userId);
  }
  const pendingTestimonialCollisions: string[] = [];
  for (const [masterId, users] of byMaster) {
    if (users.has(idA) && users.has(idB)) {
      pendingTestimonialCollisions.push(masterId);
    }
  }

  return { bothPendingVip, pendingTestimonialCollisions };
}

export type OverrideSource = "survivor" | "loser";

export interface MergeUsersInput {
  survivorId: string;
  loserId: string;
  overrides: {
    firstName: OverrideSource;
    lastName: OverrideSource;
    email: OverrideSource;
    photoUrl: OverrideSource;
  };
  auditByAdmin: string;
}

export type MergeUsersResult =
  | { ok: true; survivorId: string }
  | { ok: false; reason: "not-found" | "conflicts"; conflicts?: MergeConflicts };

function pickOverride<T>(
  source: OverrideSource,
  survivorValue: T,
  loserValue: T,
): T {
  return source === "survivor" ? survivorValue : loserValue;
}

export async function mergeUsers(
  input: MergeUsersInput,
): Promise<MergeUsersResult> {
  if (!db) return { ok: false, reason: "not-found" };
  if (input.survivorId === input.loserId) {
    return { ok: false, reason: "not-found" };
  }

  const conflicts = await getMergeConflicts(input.survivorId, input.loserId);
  if (
    conflicts.bothPendingVip ||
    conflicts.pendingTestimonialCollisions.length > 0
  ) {
    return { ok: false, reason: "conflicts", conflicts };
  }

  return await db
    .transaction(async (tx) => {
      const [survivorRows, loserRows] = await Promise.all([
        tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, input.survivorId))
          .limit(1),
        tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, input.loserId))
          .limit(1),
      ]);
      const survivor = survivorRows[0];
      const loser = loserRows[0];
      if (!survivor || !loser) throw new Error("MERGE_NOT_FOUND");

      // 1. Re-point every FK that references users.id from loser → survivor.
      //    google_oauth_tokens (PK) is handled separately below.
      await Promise.all([
        tx
          .update(schema.bookings)
          .set({ userId: input.survivorId })
          .where(eq(schema.bookings.userId, input.loserId)),
        tx
          .update(schema.vipRequests)
          .set({ userId: input.survivorId })
          .where(eq(schema.vipRequests.userId, input.loserId)),
        tx
          .update(schema.vipRequests)
          .set({ decidedBy: input.survivorId })
          .where(eq(schema.vipRequests.decidedBy, input.loserId)),
        tx
          .update(schema.testimonials)
          .set({ userId: input.survivorId })
          .where(eq(schema.testimonials.userId, input.loserId)),
        tx
          .update(schema.testimonials)
          .set({ decidedBy: input.survivorId })
          .where(eq(schema.testimonials.decidedBy, input.loserId)),
        tx
          .update(schema.siteSettings)
          .set({ updatedBy: input.survivorId })
          .where(eq(schema.siteSettings.updatedBy, input.loserId)),
        tx
          .update(schema.serviceCategories)
          .set({ updatedBy: input.survivorId })
          .where(eq(schema.serviceCategories.updatedBy, input.loserId)),
        tx
          .update(schema.services)
          .set({ updatedBy: input.survivorId })
          .where(eq(schema.services.updatedBy, input.loserId)),
        tx
          .update(schema.studioPhotos)
          .set({ uploadedBy: input.survivorId })
          .where(eq(schema.studioPhotos.uploadedBy, input.loserId)),
      ]);

      // 2. google_oauth_tokens.userId is a PK. Re-point if survivor lacks
      //    a row; otherwise delete the loser's row to avoid a PK collision.
      const survivorTokens = await tx
        .select({ userId: schema.googleOauthTokens.userId })
        .from(schema.googleOauthTokens)
        .where(eq(schema.googleOauthTokens.userId, input.survivorId))
        .limit(1);
      if (survivorTokens.length === 0) {
        await tx
          .update(schema.googleOauthTokens)
          .set({ userId: input.survivorId })
          .where(eq(schema.googleOauthTokens.userId, input.loserId));
      } else {
        await tx
          .delete(schema.googleOauthTokens)
          .where(eq(schema.googleOauthTokens.userId, input.loserId));
      }

      // 3. Delete the loser row BEFORE patching the survivor. users.telegram_id
      //    and users.google_sub carry UNIQUE constraints — updating the
      //    survivor with the loser's provider id while the loser row still
      //    holds it would abort with a unique-constraint violation.
      await tx.delete(schema.users).where(eq(schema.users.id, input.loserId));

      // 4. Absorb provider id + per-field overrides + audit note onto the survivor.
      const patch: Partial<typeof schema.users.$inferInsert> = {};
      if (!survivor.telegramId && loser.telegramId) {
        patch.telegramId = loser.telegramId;
      }
      if (!survivor.googleSub && loser.googleSub) {
        patch.googleSub = loser.googleSub;
      }
      patch.firstName = pickOverride(
        input.overrides.firstName,
        survivor.firstName,
        loser.firstName,
      );
      patch.lastName = pickOverride(
        input.overrides.lastName,
        survivor.lastName,
        loser.lastName,
      );
      patch.email = pickOverride(
        input.overrides.email,
        survivor.email,
        loser.email,
      );
      patch.photoUrl = pickOverride(
        input.overrides.photoUrl,
        survivor.photoUrl,
        loser.photoUrl,
      );

      const today = new Date().toISOString().slice(0, 10);
      const auditLine = `[merged ${today} — absorbed ${input.loserId} by ${input.auditByAdmin}]`;
      patch.adminNote = survivor.adminNote
        ? `${auditLine}\n\n${survivor.adminNote}`
        : auditLine;

      await tx
        .update(schema.users)
        .set(patch)
        .where(eq(schema.users.id, input.survivorId));

      return { ok: true as const, survivorId: input.survivorId };
    })
    .catch((err): MergeUsersResult => {
      if (err instanceof Error && err.message === "MERGE_NOT_FOUND") {
        return { ok: false, reason: "not-found" };
      }
      throw err;
    });
}

/**
 * Returns the ids of every admin user, in no particular order. Used by
 * the notification dispatcher to fan out admin-targeted categories
 * (booking_created, vip_request_submitted, testimonial_submitted).
 */
export async function listAdminUserIds(): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await withQueryTimeout(
      db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.role, "admin")),
      ADMIN_READ_TIMEOUT_MS,
      "users.listAdminIds",
    );
    return rows.map((r) => r.id);
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/users-admin] listAdminUserIds timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}
