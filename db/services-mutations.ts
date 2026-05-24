import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB writes for services + categories. No auth — server actions
 * gate the caller. Mirrors db/services.ts (reads) for db-null and
 * missing-table tolerance.
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
  | { ok: false; error: "db_unavailable" };

const DB_UNAVAILABLE: MutationResult = { ok: false, error: "db_unavailable" };

function withGuard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((error) => {
    if (isMissingTable(error)) return fallback;
    throw error;
  });
}

// ── categories ──────────────────────────────────────────────────────

export async function createCategory(
  input: schema.NewServiceCategory & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.serviceCategories).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "published",
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateCategory(
  id: string,
  patch: Partial<schema.NewServiceCategory> & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.serviceCategories)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.serviceCategories.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function archiveCategory(
  id: string,
  updatedBy?: string | null,
): Promise<MutationResult> {
  return updateCategory(id, { status: "archived", updatedBy });
}

export async function restoreCategory(
  id: string,
  updatedBy?: string | null,
): Promise<MutationResult> {
  return updateCategory(id, { status: "published", updatedBy });
}

export async function countNonArchivedServicesInCategory(
  id: string,
): Promise<number> {
  if (!db) return 0;
  return withGuard(async () => {
    const rows = await db!
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(
        and(
          eq(schema.services.categoryId, id),
          ne(schema.services.status, "archived"),
        ),
      );
    return rows.length;
  }, 0);
}

// ── services ────────────────────────────────────────────────────────

export async function createService(
  input: schema.NewService & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.services).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "draft",
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateService(
  id: string,
  patch: Partial<schema.NewService> & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.services)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.services.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function archiveService(
  id: string,
  updatedBy?: string | null,
): Promise<MutationResult> {
  return updateService(id, { status: "archived", updatedBy });
}

export async function restoreService(
  id: string,
  updatedBy?: string | null,
): Promise<MutationResult> {
  return updateService(id, { status: "published", updatedBy });
}

// ── reordering ──────────────────────────────────────────────────────

export async function reorderCategories(
  orderedIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.serviceCategories)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.serviceCategories.id, orderedIds[i]!));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function reorderServices(
  orderedIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.services)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.services.id, orderedIds[i]!));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}
