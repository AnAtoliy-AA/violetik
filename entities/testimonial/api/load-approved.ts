import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeVipSubquery } from "@/db/vip-requests";
import { buildAuthorDisplay } from "../lib/build-author-display";
import type { ApprovedTestimonial } from "../model/types";

export interface ListApprovedTestimonialsOptions {
  masterId?: string;
  /**
   * §11.3 — optional service filter. When set, returns only testimonials
   * explicitly tied to that service (`testimonials.service_id = serviceId`).
   * Legacy rows where `service_id IS NULL` are excluded, so a service
   * with no service-specific reviews surfaces an empty list and the
   * UI can hide the section.
   */
  serviceId?: string;
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
  const clauses = [eq(schema.testimonials.status, "approved")];
  if (options.masterId) {
    clauses.push(eq(schema.testimonials.masterId, options.masterId));
  }
  if (options.serviceId) {
    clauses.push(eq(schema.testimonials.serviceId, options.serviceId));
  }
  const where = clauses.length === 1 ? clauses[0] : and(...clauses);
  try {
    const activeVip = activeVipSubquery();
    // §11.4 — correlated EXISTS subquery: did this user ever have a
    // confirmed or completed booking with the master they reviewed?
    // EXISTS keeps the outer row count stable (no Cartesian blow-up
    // from joining bookings directly).
    const verifiedExpr = sql<boolean>`EXISTS (
      SELECT 1
      FROM ${schema.bookings} b
      WHERE b.user_id = ${schema.testimonials.userId}
        AND b.master_id = ${schema.testimonials.masterId}
        AND b.status IN ('confirmed', 'completed')
    )`;
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
        vipUserId: activeVip.userId,
        verified: verifiedExpr,
      })
      .from(schema.testimonials)
      .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
      .leftJoin(activeVip, eq(activeVip.userId, schema.testimonials.userId))
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
      authorIsVip: r.vipUserId !== null,
      hasMatchedBooking: Boolean(r.verified),
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
