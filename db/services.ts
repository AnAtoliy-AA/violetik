import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { getServiceIdsHavingAnyPublishedMaster } from "./masters";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

/**
 * Pure DB queries for services + categories. No locale logic, no price
 * formatting — those belong to `entities/service/api/load.ts`. Returns
 * empty arrays when DATABASE_URL is unset so the build / CI / local dev
 * keep working without the DB.
 *
 * Also tolerant of the table not having been migrated yet (42P01 =
 * undefined_table) — mirrors the posture in `db/studio-photos.ts`.
 *
 * SSR hot-path reads are wrapped in `withQueryTimeout` so a sick
 * Supabase pooler conn can't block a page render for the 2-min
 * server-side statement_timeout. Same rationale as db/site-settings.ts.
 */

const SSR_READ_TIMEOUT_MS = 5_000;

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
    return await withQueryTimeout(
      db.select().from(schema.services).orderBy(schema.services.sortOrder),
      SSR_READ_TIMEOUT_MS,
      "services.listAll",
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/services] listAllServices timed out:", error.message);
      return [];
    }
    throw error;
  }
}

export async function listPublishedServices(): Promise<schema.Service[]> {
  if (!db) return [];
  try {
    // Two independent reads — parallelize so their 5s SSR budgets
    // overlap. Sequential would stack to 10s when the pool is sick.
    const [eligibleIds, rows] = await Promise.all([
      getServiceIdsHavingAnyPublishedMaster(),
      withQueryTimeout(
        db
          .select()
          .from(schema.services)
          .where(eq(schema.services.status, "published"))
          .orderBy(schema.services.sortOrder),
        SSR_READ_TIMEOUT_MS,
        "services.listPublished",
      ),
    ]);
    // Fall through to the unfiltered list when the masters table has
    // no published rows (first-run installs would otherwise show an
    // empty menu). Admin sees orphan badges in /admin/services.
    if (eligibleIds.size === 0) return rows;
    return rows.filter((r) => eligibleIds.has(r.id));
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/services] listPublishedServices timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export async function getServiceById(
  id: string,
): Promise<schema.Service | null> {
  if (!db) return null;
  try {
    const rows = await withQueryTimeout(
      db
        .select()
        .from(schema.services)
        .where(eq(schema.services.id, id))
        .limit(1),
      SSR_READ_TIMEOUT_MS,
      "services.getById",
    );
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/services] getServiceById timed out:", error.message);
      return null;
    }
    throw error;
  }
}

export async function listAllCategories(): Promise<
  schema.ServiceCategoryRow[]
> {
  if (!db) return [];
  try {
    return await withQueryTimeout(
      db
        .select()
        .from(schema.serviceCategories)
        .orderBy(schema.serviceCategories.sortOrder),
      SSR_READ_TIMEOUT_MS,
      "services.listAllCategories",
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/services] listAllCategories timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export async function listPublishedCategories(): Promise<
  schema.ServiceCategoryRow[]
> {
  if (!db) return [];
  try {
    return await withQueryTimeout(
      db
        .select()
        .from(schema.serviceCategories)
        .where(eq(schema.serviceCategories.status, "published"))
        .orderBy(schema.serviceCategories.sortOrder),
      SSR_READ_TIMEOUT_MS,
      "services.listPublishedCategories",
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/services] listPublishedCategories timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}
