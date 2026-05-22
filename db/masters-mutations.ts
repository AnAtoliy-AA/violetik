import { and, count, eq, gt, ne, notInArray, sql } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB writes for masters + master_services. No auth — server
 * actions gate the caller. Mirrors db/services-mutations.ts (writes)
 * for db-null and missing-table tolerance.
 */

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

export type MutationResult =
  | { ok: true }
  | { ok: false; error: "db_unavailable" }
  | { ok: false; error: "master_has_upcoming_bookings"; blockingCount: number };

const DB_UNAVAILABLE = {
  ok: false as const,
  error: "db_unavailable" as const,
};

function withGuard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((error) => {
    if (isMissingTable(error)) return fallback;
    throw error;
  });
}

export async function createMaster(
  input: schema.NewMaster,
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.masters).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "draft",
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateMaster(
  id: string,
  patch: Omit<schema.NewMaster, "id" | "createdAt">,
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.masters)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(schema.masters.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function archiveMaster(id: string): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    const count = await countUpcomingBookingsForMaster(id);
    if (count > 0) {
      return {
        ok: false,
        error: "master_has_upcoming_bookings",
        blockingCount: count,
      };
    }
    await db!
      .update(schema.masters)
      .set({ status: "archived", updatedAt: sql`now()` })
      .where(eq(schema.masters.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function restoreMaster(id: string): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.masters)
      .set({ status: "draft", updatedAt: sql`now()` })
      .where(eq(schema.masters.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function reorderMasters(
  ids: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await tx
          .update(schema.masters)
          .set({ sortOrder: i, updatedAt: sql`now()` })
          .where(eq(schema.masters.id, ids[i]));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Replaces the master's full set of service specialties with the
 * given list. Diff-based: rows present in `serviceIds` and missing
 * from the DB are inserted; rows in the DB but absent from
 * `serviceIds` are deleted. Single transaction.
 */
export async function setMasterServices(
  masterId: string,
  serviceIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      if (serviceIds.length === 0) {
        await tx
          .delete(schema.masterServices)
          .where(eq(schema.masterServices.masterId, masterId));
      } else {
        await tx
          .delete(schema.masterServices)
          .where(
            and(
              eq(schema.masterServices.masterId, masterId),
              notInArray(
                schema.masterServices.serviceId,
                serviceIds as string[],
              ),
            ),
          );
      }
      for (const sid of serviceIds) {
        await tx
          .insert(schema.masterServices)
          .values({ masterId, serviceId: sid })
          .onConflictDoNothing();
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Counts upcoming, non-cancelled bookings tied to a master. Used by
 * archiveMaster to refuse archiving until future bookings have been
 * reassigned or cancelled.
 */
export async function countUpcomingBookingsForMaster(
  masterId: string,
): Promise<number> {
  if (!db) return 0;
  try {
    const rows = await db
      .select({ n: count() })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.masterId, masterId),
          gt(schema.bookings.scheduledFor, sql`now()`),
          ne(schema.bookings.status, "cancelled"),
        ),
      );
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    throw error;
  }
}
