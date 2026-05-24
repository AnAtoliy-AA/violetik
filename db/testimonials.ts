import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { activeVipSubquery } from "./vip-requests";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

// SSR read budget — same rationale as db/site-settings.ts.
const SSR_READ_TIMEOUT_MS = 5_000;
const ADMIN_READ_TIMEOUT_MS = SSR_READ_TIMEOUT_MS;

export function generateTestimonialId(): string {
  return `tst_${randomBytes(8).toString("hex")}`;
}

export interface NewTestimonialInput {
  userId: string;
  masterId: string;
  body: string;
}

export type CreateTestimonialResult =
  | { ok: true; row: schema.Testimonial }
  | { ok: false; reason: "duplicate_pending" };

function isMissingTable(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if ("code" in cur && (cur as { code: unknown }).code === "42P01") {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

function isUniqueViolation(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if ("code" in cur && (cur as { code: unknown }).code === "23505") {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Inserts a pending testimonial. Returns null if DB isn't configured.
 * Returns `{ ok: false, reason: 'duplicate_pending' }` when the
 * partial unique index `testimonials_one_pending_per_pair` blocks the
 * insert because another pending row already exists for the same
 * (user, master).
 */
export async function createTestimonial(
  input: NewTestimonialInput,
): Promise<CreateTestimonialResult | null> {
  if (!db) return null;
  const id = generateTestimonialId();
  try {
    const rows = await db
      .insert(schema.testimonials)
      .values({
        id,
        userId: input.userId,
        masterId: input.masterId,
        body: input.body,
      })
      .returning();
    if (!rows[0]) return null;
    return { ok: true, row: rows[0] };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "duplicate_pending" };
    }
    throw error;
  }
}

export async function listUserTestimonials(
  userId: string,
): Promise<schema.Testimonial[]> {
  if (!db) return [];
  try {
    return await withQueryTimeout(
      db
        .select()
        .from(schema.testimonials)
        .where(eq(schema.testimonials.userId, userId))
        .orderBy(desc(schema.testimonials.createdAt)),
      SSR_READ_TIMEOUT_MS,
      "testimonials.listUser",
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/testimonials] listUserTestimonials timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export interface AdminTestimonialRow {
  id: string;
  body: string;
  status: schema.TestimonialStatus;
  pendingEditBody?: string | null;
  pendingRemoval?: boolean;
  changeRequestedAt?: Date | null;
  createdAt: Date;
  decidedAt: Date | null;
  userId: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorUsername: string | null;
  authorEmail: string | null;
  authorPhotoUrl: string | null;
  authorIsVip: boolean;
  masterId: string;
  masterNameEn: string;
  masterNameRu: string;
  masterNameBy: string;
}

export async function listTestimonialsByStatus(
  status: schema.TestimonialStatus,
): Promise<AdminTestimonialRow[]> {
  if (!db) return [];
  try {
    const orderCol =
      status === "approved"
        ? desc(schema.testimonials.decidedAt)
        : desc(schema.testimonials.createdAt);
    const activeVip = activeVipSubquery();
    const rows = await withQueryTimeout(
      db
        .select({
          id: schema.testimonials.id,
          body: schema.testimonials.body,
          status: schema.testimonials.status,
          createdAt: schema.testimonials.createdAt,
          decidedAt: schema.testimonials.decidedAt,
          userId: schema.testimonials.userId,
          authorFirstName: schema.users.firstName,
          authorLastName: schema.users.lastName,
          authorUsername: schema.users.username,
          authorEmail: schema.users.email,
          authorPhotoUrl: schema.users.photoUrl,
          vipUserId: activeVip.userId,
          masterId: schema.testimonials.masterId,
          masterNameEn: schema.masters.nameEn,
          masterNameRu: schema.masters.nameRu,
          masterNameBy: schema.masters.nameBy,
        })
        .from(schema.testimonials)
        .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
        .leftJoin(activeVip, eq(activeVip.userId, schema.testimonials.userId))
        .leftJoin(
          schema.masters,
          eq(schema.testimonials.masterId, schema.masters.id),
        )
        .where(eq(schema.testimonials.status, status))
        .orderBy(orderCol),
      ADMIN_READ_TIMEOUT_MS,
      "testimonials.listByStatus",
    );
    // leftJoin nullables — the FK in schema is NOT NULL, so in practice
    // master/user fields are always present. Coerce defensively.
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt,
      userId: r.userId,
      authorFirstName: r.authorFirstName,
      authorLastName: r.authorLastName,
      authorUsername: r.authorUsername,
      authorEmail: r.authorEmail,
      authorPhotoUrl: r.authorPhotoUrl,
      authorIsVip: r.vipUserId !== null,
      masterId: r.masterId,
      masterNameEn: r.masterNameEn ?? "",
      masterNameRu: r.masterNameRu ?? "",
      masterNameBy: r.masterNameBy ?? "",
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/testimonials] listTestimonialsByStatus timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export type DecideTestimonialInput =
  | { id: string; action: "approve"; decidedBy: string }
  | { id: string; action: "reject"; decidedBy: string };

export async function decideTestimonial(
  input: DecideTestimonialInput,
): Promise<schema.Testimonial | null> {
  if (!db) return null;
  const now = new Date();
  const nextStatus = input.action === "approve" ? "approved" : "rejected";
  try {
    const rows = await db
      .update(schema.testimonials)
      .set({
        status: nextStatus,
        decidedAt: now,
        decidedBy: input.decidedBy,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.testimonials.id, input.id),
          eq(schema.testimonials.status, "pending"),
        ),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function countPendingTestimonials(): Promise<number> {
  if (!db) return 0;
  try {
    const rows = await withQueryTimeout(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.testimonials)
        .where(eq(schema.testimonials.status, "pending")),
      ADMIN_READ_TIMEOUT_MS,
      "testimonials.countPending",
    );
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/testimonials] countPendingTestimonials timed out:",
        error.message,
      );
      return 0;
    }
    throw error;
  }
}

// ─── change-request flow (user + admin) ──────────────────────────────

export type ChangeRequestReason =
  | "not_found"
  | "not_owner"
  | "not_approved"
  | "request_already_pending";

export type ChangeRequestResult =
  | { ok: true; row: schema.Testimonial }
  | { ok: false; reason: ChangeRequestReason };

async function loadOwnedApprovedRow(
  testimonialId: string,
  userId: string,
): Promise<
  | { ok: true; row: schema.Testimonial }
  | { ok: false; reason: ChangeRequestReason }
> {
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select()
    .from(schema.testimonials)
    .where(eq(schema.testimonials.id, testimonialId))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, reason: "not_found" };
  if (row.userId !== userId) return { ok: false, reason: "not_owner" };
  if (row.status !== "approved") return { ok: false, reason: "not_approved" };
  if (row.pendingEditBody !== null || row.pendingRemoval) {
    return { ok: false, reason: "request_already_pending" };
  }
  return { ok: true, row };
}

/** User requests an edit to their approved testimonial. */
export async function requestTestimonialEdit(
  testimonialId: string,
  userId: string,
  newBody: string,
): Promise<ChangeRequestResult | null> {
  if (!db) return null;
  try {
    const gate = await loadOwnedApprovedRow(testimonialId, userId);
    if (!gate.ok) return gate;
    const now = new Date();
    const rows = await db
      .update(schema.testimonials)
      .set({
        pendingEditBody: newBody,
        changeRequestedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.testimonials.id, testimonialId))
      .returning();
    return rows[0] ? { ok: true, row: rows[0] } : { ok: false, reason: "not_found" };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

/** User requests removal of their approved testimonial. */
export async function requestTestimonialRemoval(
  testimonialId: string,
  userId: string,
): Promise<ChangeRequestResult | null> {
  if (!db) return null;
  try {
    const gate = await loadOwnedApprovedRow(testimonialId, userId);
    if (!gate.ok) return gate;
    const now = new Date();
    const rows = await db
      .update(schema.testimonials)
      .set({
        pendingRemoval: true,
        changeRequestedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.testimonials.id, testimonialId))
      .returning();
    return rows[0] ? { ok: true, row: rows[0] } : { ok: false, reason: "not_found" };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

/** User cancels their pending edit/removal request. */
export async function cancelTestimonialChangeRequest(
  testimonialId: string,
  userId: string,
): Promise<schema.Testimonial | null> {
  if (!db) return null;
  try {
    const now = new Date();
    const rows = await db
      .update(schema.testimonials)
      .set({
        pendingEditBody: null,
        pendingRemoval: false,
        changeRequestedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.testimonials.id, testimonialId),
          eq(schema.testimonials.userId, userId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

/** Admin moderation queue: every approved row with a pending change request. */
export async function listTestimonialsWithChangeRequests(): Promise<AdminTestimonialRow[]> {
  if (!db) return [];
  try {
    const activeVip = activeVipSubquery();
    const rows = await withQueryTimeout(
      db
        .select({
          id: schema.testimonials.id,
          body: schema.testimonials.body,
          status: schema.testimonials.status,
          pendingEditBody: schema.testimonials.pendingEditBody,
          pendingRemoval: schema.testimonials.pendingRemoval,
          changeRequestedAt: schema.testimonials.changeRequestedAt,
          createdAt: schema.testimonials.createdAt,
          decidedAt: schema.testimonials.decidedAt,
          userId: schema.testimonials.userId,
          authorFirstName: schema.users.firstName,
          authorLastName: schema.users.lastName,
          authorUsername: schema.users.username,
          authorEmail: schema.users.email,
          authorPhotoUrl: schema.users.photoUrl,
          vipUserId: activeVip.userId,
          masterId: schema.testimonials.masterId,
          masterNameEn: schema.masters.nameEn,
          masterNameRu: schema.masters.nameRu,
          masterNameBy: schema.masters.nameBy,
        })
        .from(schema.testimonials)
        .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
        .leftJoin(activeVip, eq(activeVip.userId, schema.testimonials.userId))
        .leftJoin(
          schema.masters,
          eq(schema.testimonials.masterId, schema.masters.id),
        )
        .where(
          sql`${schema.testimonials.status} = 'approved'
              AND (${schema.testimonials.pendingEditBody} IS NOT NULL
                   OR ${schema.testimonials.pendingRemoval} = true)`,
        )
        .orderBy(desc(schema.testimonials.changeRequestedAt)),
      ADMIN_READ_TIMEOUT_MS,
      "testimonials.listWithChangeRequests",
    );
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      pendingEditBody: r.pendingEditBody,
      pendingRemoval: r.pendingRemoval,
      changeRequestedAt: r.changeRequestedAt,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt,
      userId: r.userId,
      authorFirstName: r.authorFirstName,
      authorLastName: r.authorLastName,
      authorUsername: r.authorUsername,
      authorEmail: r.authorEmail,
      authorPhotoUrl: r.authorPhotoUrl,
      authorIsVip: r.vipUserId !== null,
      masterId: r.masterId,
      masterNameEn: r.masterNameEn ?? "",
      masterNameRu: r.masterNameRu ?? "",
      masterNameBy: r.masterNameBy ?? "",
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/testimonials] listTestimonialsWithChangeRequests timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

/** Admin resolves an edit request: accept ⇒ body becomes pendingEditBody, otherwise discard. */
export async function resolveTestimonialEdit(
  testimonialId: string,
  adminId: string,
  accept: boolean,
): Promise<schema.Testimonial | null> {
  if (!db) return null;
  try {
    const now = new Date();
    const existing = await db
      .select()
      .from(schema.testimonials)
      .where(eq(schema.testimonials.id, testimonialId))
      .limit(1);
    const row = existing[0];
    if (!row || row.pendingEditBody === null) return null;
    const nextBody = accept ? row.pendingEditBody : row.body;
    const rows = await db
      .update(schema.testimonials)
      .set({
        body: nextBody,
        pendingEditBody: null,
        // pendingRemoval untouched in case it was set separately
        changeRequestedAt: row.pendingRemoval ? row.changeRequestedAt : null,
        decidedAt: now,
        decidedBy: adminId,
        updatedAt: now,
      })
      .where(eq(schema.testimonials.id, testimonialId))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

/** Admin resolves a removal request: accept ⇒ status=removed; reject ⇒ clear flag. */
export async function resolveTestimonialRemoval(
  testimonialId: string,
  adminId: string,
  accept: boolean,
): Promise<schema.Testimonial | null> {
  if (!db) return null;
  try {
    const now = new Date();
    const rows = await db
      .update(schema.testimonials)
      .set({
        status: accept ? "removed" : "approved",
        pendingRemoval: false,
        pendingEditBody: null,
        changeRequestedAt: null,
        decidedAt: now,
        decidedBy: adminId,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.testimonials.id, testimonialId),
          eq(schema.testimonials.pendingRemoval, true),
        ),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

/** Admin direct soft-delete (no user request needed). Marks as removed. */
export async function adminSoftDeleteTestimonial(
  testimonialId: string,
  adminId: string,
): Promise<schema.Testimonial | null> {
  if (!db) return null;
  try {
    const now = new Date();
    const rows = await db
      .update(schema.testimonials)
      .set({
        status: "removed",
        pendingEditBody: null,
        pendingRemoval: false,
        changeRequestedAt: null,
        decidedAt: now,
        decidedBy: adminId,
        updatedAt: now,
      })
      .where(eq(schema.testimonials.id, testimonialId))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function countPendingChangeRequests(): Promise<number> {
  if (!db) return 0;
  try {
    const rows = await withQueryTimeout(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.testimonials)
        .where(
          sql`${schema.testimonials.status} = 'approved'
              AND (${schema.testimonials.pendingEditBody} IS NOT NULL
                   OR ${schema.testimonials.pendingRemoval} = true)`,
        ),
      ADMIN_READ_TIMEOUT_MS,
      "testimonials.countPendingChangeRequests",
    );
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/testimonials] countPendingChangeRequests timed out:",
        error.message,
      );
      return 0;
    }
    throw error;
  }
}
