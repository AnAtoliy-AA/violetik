import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
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
