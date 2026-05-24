import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

export type NotificationCategoryMap = Partial<Record<string, boolean>>;

/**
 * Reads a user's category opt-ins. Missing rows → empty map. Empty
 * map = nothing enabled, which matches our default-off policy.
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationCategoryMap> {
  if (!db) return {};
  const rows = await db
    .select({ categories: schema.notificationPreferences.categories })
    .from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.userId, userId))
    .limit(1);
  return rows[0]?.categories ?? {};
}

/**
 * Upserts the full categories map. Callers pass the complete current
 * map, not a delta — simpler reasoning, no surprises if the keyset
 * changes between writes.
 */
export async function saveNotificationPreferences(
  userId: string,
  categories: NotificationCategoryMap,
): Promise<NotificationCategoryMap | null> {
  if (!db) return null;
  const rows = await db
    .insert(schema.notificationPreferences)
    .values({ userId, categories })
    .onConflictDoUpdate({
      target: schema.notificationPreferences.userId,
      set: { categories, updatedAt: sql`now()` },
    })
    .returning({ categories: schema.notificationPreferences.categories });
  return rows[0]?.categories ?? null;
}

export async function setNotificationPreference(
  userId: string,
  category: string,
  enabled: boolean,
): Promise<NotificationCategoryMap | null> {
  const current = await getNotificationPreferences(userId);
  return saveNotificationPreferences(userId, { ...current, [category]: enabled });
}
