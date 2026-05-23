import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { buildAuthorDisplay } from "../lib/build-author-display";
import type { ApprovedTestimonial } from "../model/types";

export interface ListApprovedTestimonialsOptions {
  masterId?: string;
  limit?: number;
}

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

export async function listApprovedTestimonials(
  options: ListApprovedTestimonialsOptions = {},
): Promise<ApprovedTestimonial[]> {
  if (!db) return [];
  const limit = options.limit ?? 20;
  const where = options.masterId
    ? and(
        eq(schema.testimonials.status, "approved"),
        eq(schema.testimonials.masterId, options.masterId),
      )
    : eq(schema.testimonials.status, "approved");
  try {
    const rows = await db
      .select({
        id: schema.testimonials.id,
        body: schema.testimonials.body,
        createdAt: schema.testimonials.createdAt,
        masterId: schema.testimonials.masterId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        username: schema.users.username,
        email: schema.users.email,
        photoUrl: schema.users.photoUrl,
      })
      .from(schema.testimonials)
      .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.testimonials.decidedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      masterId: r.masterId,
      authorDisplay: buildAuthorDisplay({
        firstName: r.firstName,
        lastName: r.lastName,
        username: r.username,
        email: r.email,
      }),
      authorPhotoUrl: r.photoUrl,
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
