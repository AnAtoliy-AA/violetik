import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

export type NotificationLogStatus =
  | "sent"
  | "skipped_prefs"
  | "no_subscriptions"
  | "all_failed";

export interface NotificationLogInput {
  userId: string;
  category: string;
  payload: Record<string, unknown>;
  status: NotificationLogStatus;
  error: string | null;
}

function generateId(): string {
  return `notif_${randomBytes(8).toString("hex")}`;
}

export async function recordNotification(
  input: NotificationLogInput,
): Promise<schema.NotificationLogRow | null> {
  if (!db) return null;
  const rows = await db
    .insert(schema.notificationLog)
    .values({ id: generateId(), ...input })
    .returning();
  return rows[0] ?? null;
}

/**
 * The hourly cron looks 23–25 h ahead, so the same booking lands in
 * its window for two consecutive hours. Dedup by checking for an
 * existing reminder log row in the last 48 h.
 */
export async function hasRecentBookingReminder(
  bookingId: string,
): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .select({ id: schema.notificationLog.id })
    .from(schema.notificationLog)
    .where(
      and(
        eq(schema.notificationLog.category, "booking_reminder_24h"),
        sql`${schema.notificationLog.payload}->>'bookingId' = ${bookingId}`,
        sql`${schema.notificationLog.sentAt} > now() - interval '48 hours'`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}
