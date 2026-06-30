import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import {
  pageSeoPatchSchema,
  type PageSeoEntry,
  type PageSeoOverrides,
  type PageSeoPatch,
} from "@/entities/page-seo";

function rowToEntry(row: schema.PageSeoRow): PageSeoEntry {
  return {
    titleEn: row.titleEn,
    titleRu: row.titleRu,
    titleBy: row.titleBy,
    headingEn: row.headingEn,
    headingRu: row.headingRu,
    headingBy: row.headingBy,
    descriptionEn: row.descriptionEn,
    descriptionRu: row.descriptionRu,
    descriptionBy: row.descriptionBy,
  };
}

/**
 * Reads every stored page-SEO override, keyed by page id. Returns an
 * empty map when DATABASE_URL is unset or the read fails (pre-migration
 * build-time SSG, missing table, etc.) — callers fall back to the
 * translation defaults, so the app degrades gracefully.
 */
export async function getAllPageSeo(): Promise<PageSeoOverrides> {
  if (!db) return {};
  try {
    const rows = await db.select().from(schema.pageSeo);
    const out: Record<string, PageSeoEntry> = {};
    for (const row of rows) out[row.id] = rowToEntry(row);
    return out;
  } catch (error) {
    console.warn(
      "[db/page-seo] read failed, returning no overrides:",
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

/**
 * Validates the patch via Zod and upserts one row per entry. No-op when
 * the DB isn't configured. Throws on validation failure — the server
 * action catches and surfaces.
 */
export async function updatePageSeo(
  patch: PageSeoPatch,
  updatedBy: string | null,
): Promise<void> {
  const parsed = pageSeoPatchSchema.parse(patch);
  if (!db) return;

  for (const entry of parsed.entries) {
    const values = {
      titleEn: entry.titleEn,
      titleRu: entry.titleRu,
      titleBy: entry.titleBy,
      headingEn: entry.headingEn,
      headingRu: entry.headingRu,
      headingBy: entry.headingBy,
      descriptionEn: entry.descriptionEn,
      descriptionRu: entry.descriptionRu,
      descriptionBy: entry.descriptionBy,
      updatedBy,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.pageSeo)
      .values({ id: entry.id, ...values })
      .onConflictDoUpdate({ target: schema.pageSeo.id, set: values });
  }
}

/**
 * Deletes a single page-SEO override by page id. No-op when the DB isn't
 * configured. After deletion the page falls back to its translation defaults.
 */
export async function deletePageSeo(id: string): Promise<void> {
  if (!db) return;
  await db.delete(schema.pageSeo).where(eq(schema.pageSeo.id, id));
}

/**
 * Deletes all page-SEO overrides. No-op when the DB isn't configured.
 * After deletion every page falls back to its translation defaults.
 */
export async function deleteAllPageSeo(): Promise<void> {
  if (!db) return;
  await db.delete(schema.pageSeo);
}
