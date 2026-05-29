import { eq } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB writes for gallery categories + items. No auth — server actions
 * gate the caller. Mirrors `db/services-mutations.ts` for db-null and
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

export async function createGalleryCategory(
  input: schema.NewGalleryCategory & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.galleryCategories).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateGalleryCategory(
  id: string,
  patch: Partial<schema.NewGalleryCategory> & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.galleryCategories)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.galleryCategories.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Hard-deletes a category. The caller (delete-category action) must first
 * confirm it holds no items via `countGalleryItemsInCategory`; the FK
 * `onDelete: restrict` is the database-level backstop and surfaces as a
 * thrown error here if that check is skipped.
 */
export async function deleteGalleryCategory(
  id: string,
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .delete(schema.galleryCategories)
      .where(eq(schema.galleryCategories.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function countGalleryItemsInCategory(
  id: string,
): Promise<number> {
  if (!db) return 0;
  return withGuard(async () => {
    const rows = await db!
      .select({ id: schema.galleryItems.id })
      .from(schema.galleryItems)
      .where(eq(schema.galleryItems.categoryId, id));
    return rows.length;
  }, 0);
}

// ── items ───────────────────────────────────────────────────────────

export async function createGalleryItem(
  input: schema.NewGalleryItem & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.galleryItems).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateGalleryItem(
  id: string,
  patch: Partial<schema.NewGalleryItem> & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.galleryItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.galleryItems.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Hard-deletes an item and returns its (possibly null) blob `src` so the
 * caller can purge it from Vercel Blob. Returns `{ deletedSrc: null }`
 * when the row didn't exist; null only when the DB is unavailable.
 */
export async function deleteGalleryItem(
  id: string,
): Promise<{ deletedSrc: string | null } | null> {
  if (!db) return null;
  return withGuard<{ deletedSrc: string | null } | null>(async () => {
    const rows = await db!
      .select({ src: schema.galleryItems.src })
      .from(schema.galleryItems)
      .where(eq(schema.galleryItems.id, id))
      .limit(1);
    await db!.delete(schema.galleryItems).where(eq(schema.galleryItems.id, id));
    return { deletedSrc: rows[0]?.src ?? null };
  }, null);
}

// ── reordering ──────────────────────────────────────────────────────

export async function reorderGalleryCategories(
  orderedIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.galleryCategories)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.galleryCategories.id, orderedIds[i]!));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function reorderGalleryItems(
  orderedIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.galleryItems)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.galleryItems.id, orderedIds[i]!));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}
