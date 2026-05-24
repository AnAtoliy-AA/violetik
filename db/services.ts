import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { getServiceIdsHavingAnyPublishedMaster } from "./masters";

/**
 * Pure DB queries for services + categories. No locale logic, no price
 * formatting — those belong to `entities/service/api/load.ts`. Returns
 * empty arrays when DATABASE_URL is unset so the build / CI / local dev
 * keep working without the DB.
 *
 * Also tolerant of the table not having been migrated yet (42P01 =
 * undefined_table) — mirrors the posture in `db/studio-photos.ts`.
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

export async function listAllServices(): Promise<schema.Service[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.services)
      .orderBy(schema.services.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listPublishedServices(): Promise<schema.Service[]> {
  if (!db) return [];
  try {
    const eligibleIds = await getServiceIdsHavingAnyPublishedMaster();
    const rows = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.status, "published"))
      .orderBy(schema.services.sortOrder);
    // Fall through to the unfiltered list when the masters table has
    // no published rows (first-run installs would otherwise show an
    // empty menu). Admin sees orphan badges in /admin/services.
    if (eligibleIds.size === 0) return rows;
    return rows.filter((r) => eligibleIds.has(r.id));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getServiceById(
  id: string,
): Promise<schema.Service | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function listAllCategories(): Promise<
  schema.ServiceCategoryRow[]
> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.serviceCategories)
      .orderBy(schema.serviceCategories.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listPublishedCategories(): Promise<
  schema.ServiceCategoryRow[]
> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.serviceCategories)
      .where(eq(schema.serviceCategories.status, "published"))
      .orderBy(schema.serviceCategories.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
