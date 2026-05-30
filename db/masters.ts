import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB queries for masters + master_services. No locale logic, no
 * photo joining — those belong to entities/master/api/load.ts. Returns
 * empty arrays / null when DATABASE_URL is unset, and tolerates the
 * table not having been migrated yet (42P01). Mirrors db/services.ts.
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

export async function listAllMasters(): Promise<schema.Master[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.masters)
      .orderBy(schema.masters.sortOrder, schema.masters.id);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listPublishedMasters(): Promise<schema.Master[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.masters)
      .where(eq(schema.masters.status, "published"))
      .orderBy(schema.masters.sortOrder, schema.masters.id);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getMasterById(
  id: string,
): Promise<schema.Master | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.masters)
      .where(eq(schema.masters.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function getMasterIdsForService(
  serviceId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await db
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
      );
    return rows.map((r) => r.masterId);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

/**
 * All master ids linked to a service, regardless of master status.
 * Unlike getMasterIdsForService (published-only, used by the menu),
 * the service editor needs every link — including draft masters — to
 * seed its picker. Mirrors getServiceIdsForMaster on the master side.
 */
export async function getAllMasterIdsForService(
  serviceId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select({ masterId: schema.masterServices.masterId })
      .from(schema.masterServices)
      .where(eq(schema.masterServices.serviceId, serviceId));
    return rows.map((r) => r.masterId);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getServiceIdsForMaster(
  masterId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select({ serviceId: schema.masterServices.serviceId })
      .from(schema.masterServices)
      .where(eq(schema.masterServices.masterId, masterId));
    return rows.map((r) => r.serviceId);
  } catch (error) {
    if (isMissingTable(error)) return [];
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
    const rows = await db
      .selectDistinct({ serviceId: schema.masterServices.serviceId })
      .from(schema.masterServices)
      .innerJoin(
        schema.masters,
        eq(schema.masterServices.masterId, schema.masters.id),
      )
      .where(eq(schema.masters.status, "published"));
    return new Set(rows.map((r) => r.serviceId));
  } catch (error) {
    if (isMissingTable(error)) return new Set();
    throw error;
  }
}
