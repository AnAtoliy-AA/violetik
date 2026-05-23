import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

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
    return await db
      .select()
      .from(schema.testimonials)
      .where(eq(schema.testimonials.userId, userId))
      .orderBy(desc(schema.testimonials.createdAt));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export interface AdminTestimonialRow {
  id: string;
  body: string;
  status: schema.TestimonialStatus;
  createdAt: Date;
  decidedAt: Date | null;
  userId: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorUsername: string | null;
  authorEmail: string | null;
  authorPhotoUrl: string | null;
  masterId: string;
  masterNameEn: string;
  masterNameRu: string;
  masterNameBe: string;
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
    const rows = await db
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
        masterId: schema.testimonials.masterId,
        masterNameEn: schema.masters.nameEn,
        masterNameRu: schema.masters.nameRu,
        masterNameBe: schema.masters.nameBe,
      })
      .from(schema.testimonials)
      .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
      .leftJoin(
        schema.masters,
        eq(schema.testimonials.masterId, schema.masters.id),
      )
      .where(eq(schema.testimonials.status, status))
      .orderBy(orderCol);
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
      masterId: r.masterId,
      masterNameEn: r.masterNameEn ?? "",
      masterNameRu: r.masterNameRu ?? "",
      masterNameBe: r.masterNameBe ?? "",
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
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
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.testimonials)
      .where(eq(schema.testimonials.status, "pending"));
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    throw error;
  }
}
