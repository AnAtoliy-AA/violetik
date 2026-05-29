import { eq } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB reads for the admin-managed gallery (categories + items). No
 * locale logic — that belongs to `entities/gallery/api/load.ts`. Returns
 * empty arrays / null when DATABASE_URL is unset so build / CI / local dev
 * keep working without the DB, and tolerant of the tables not being
 * migrated yet (42P01) — mirrors `db/studio-photos.ts`.
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

export async function listGalleryCategories(): Promise<
  schema.GalleryCategoryRow[]
> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.galleryCategories)
      .orderBy(schema.galleryCategories.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listGalleryItems(): Promise<schema.GalleryItemRow[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.galleryItems)
      .orderBy(schema.galleryItems.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getGalleryCategoryById(
  id: string,
): Promise<schema.GalleryCategoryRow | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.galleryCategories)
      .where(eq(schema.galleryCategories.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function getGalleryItemById(
  id: string,
): Promise<schema.GalleryItemRow | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.galleryItems)
      .where(eq(schema.galleryItems.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}
