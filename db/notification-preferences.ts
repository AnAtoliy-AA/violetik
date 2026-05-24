import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

const SSR_READ_TIMEOUT_MS = 5_000;

export type NotificationCategoryMap = Partial<Record<string, boolean>>;

/**
 * Reads a user's category opt-ins. Missing rows → empty map. Empty
 * map = nothing enabled, which matches our default-off policy.
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationCategoryMap> {
  if (!db) return {};
  try {
    const rows = await withQueryTimeout(
      db
        .select({ categories: schema.notificationPreferences.categories })
        .from(schema.notificationPreferences)
        .where(eq(schema.notificationPreferences.userId, userId))
        .limit(1),
      SSR_READ_TIMEOUT_MS,
      "notification_prefs.get",
    );
    return rows[0]?.categories ?? {};
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/notification-preferences] getNotificationPreferences timed out:",
        error.message,
      );
      return {};
    }
    throw error;
  }
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
