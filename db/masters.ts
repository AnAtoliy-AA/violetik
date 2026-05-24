import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

/**
 * Pure DB queries for masters + master_services. No locale logic, no
 * photo joining — those belong to entities/master/api/load.ts. Returns
 * empty arrays / null when DATABASE_URL is unset, and tolerates the
 * table not having been migrated yet (42P01). Mirrors db/services.ts.
 *
 * SSR hot-path reads are wrapped in `withQueryTimeout` — same rationale
 * as db/services.ts and db/site-settings.ts.
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

export async function listAllMasters(): Promise<schema.Master[]> {
  if (!db) return [];
  try {
    return await withQueryTimeout(
      db
        .select()
        .from(schema.masters)
        .orderBy(schema.masters.sortOrder, schema.masters.id),
      SSR_READ_TIMEOUT_MS,
      "masters.listAll",
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/masters] listAllMasters timed out:", error.message);
      return [];
    }
    throw error;
  }
}

export async function listPublishedMasters(): Promise<schema.Master[]> {
  if (!db) return [];
  try {
    return await withQueryTimeout(
      db
        .select()
        .from(schema.masters)
        .where(eq(schema.masters.status, "published"))
        .orderBy(schema.masters.sortOrder, schema.masters.id),
      SSR_READ_TIMEOUT_MS,
      "masters.listPublished",
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/masters] listPublishedMasters timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export async function getMasterById(
  id: string,
): Promise<schema.Master | null> {
  if (!db) return null;
  try {
    const rows = await withQueryTimeout(
      db
        .select()
        .from(schema.masters)
        .where(eq(schema.masters.id, id))
        .limit(1),
      SSR_READ_TIMEOUT_MS,
      "masters.getById",
    );
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    if (error instanceof QueryTimeoutError) {
      console.warn("[db/masters] getMasterById timed out:", error.message);
      return null;
    }
    throw error;
  }
}

export async function getMasterIdsForService(
  serviceId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await withQueryTimeout(
      db
        .select({ masterId: schema.masterServices.masterId })
        .from(schema.masterServices)
        .innerJoin(
          schema.masters,
          eq(schema.masterServices.masterId, schema.masters.id),
        )
        .where(
          and(
            eq(schema.masterServices.serviceId, serviceId),
            eq(schema.masters.status, "published"),
          ),
        ),
      SSR_READ_TIMEOUT_MS,
      "masters.idsForService",
    );
    return rows.map((r) => r.masterId);
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/masters] getMasterIdsForService timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export async function getServiceIdsForMaster(
  masterId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await withQueryTimeout(
      db
        .select({ serviceId: schema.masterServices.serviceId })
        .from(schema.masterServices)
        .where(eq(schema.masterServices.masterId, masterId)),
      SSR_READ_TIMEOUT_MS,
      "masters.serviceIdsForMaster",
    );
    return rows.map((r) => r.serviceId);
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/masters] getServiceIdsForMaster timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

/**
 * Set of service IDs that have at least one *published* master linked.
 * Used by listPublishedServices() to hide orphan services from the
 * public menu. Empty set when DB is unreachable, table missing, or no
 * published masters exist.
 */
export async function getServiceIdsHavingAnyPublishedMaster(): Promise<
  Set<string>
> {
  if (!db) return new Set();
  try {
    const rows = await withQueryTimeout(
      db
        .selectDistinct({ serviceId: schema.masterServices.serviceId })
        .from(schema.masterServices)
        .innerJoin(
          schema.masters,
          eq(schema.masterServices.masterId, schema.masters.id),
        )
        .where(eq(schema.masters.status, "published")),
      SSR_READ_TIMEOUT_MS,
      "masters.publishedServiceIds",
    );
    return new Set(rows.map((r) => r.serviceId));
  } catch (error) {
    if (isMissingTable(error)) return new Set();
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/masters] getServiceIdsHavingAnyPublishedMaster timed out:",
        error.message,
      );
      return new Set();
    }
    throw error;
  }
}
