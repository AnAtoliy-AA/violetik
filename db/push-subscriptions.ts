import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { QueryTimeoutError, withQueryTimeout } from "./with-query-timeout";

const SSR_READ_TIMEOUT_MS = 5_000;

export interface NewPushSubscription {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

function generateId(): string {
  return `pushsub_${randomBytes(8).toString("hex")}`;
}

/**
 * Upsert keyed on endpoint (which is globally unique per browser SW).
 * Re-saving the same endpoint refreshes its user / keys / last_seen_at.
 */
export async function saveSubscription(
  input: NewPushSubscription,
): Promise<schema.PushSubscriptionRow | null> {
  if (!db) return null;
  const id = generateId();
  const rows = await db
    .insert(schema.pushSubscriptions)
    .values({ id, ...input })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        lastSeenAt: sql`now()`,
      },
    })
    .returning();
  return rows[0] ?? null;
}

export async function listSubscriptionsByUser(
  userId: string,
): Promise<schema.PushSubscriptionRow[]> {
  if (!db) return [];
  try {
    return await withQueryTimeout(
      db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, userId)),
      SSR_READ_TIMEOUT_MS,
      "push_subscriptions.listByUser",
    );
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.warn(
        "[db/push-subscriptions] listSubscriptionsByUser timed out:",
        error.message,
      );
      return [];
    }
    throw error;
  }
}

export async function deleteSubscriptionByEndpoint(
  endpoint: string,
): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .delete(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
    .returning({ id: schema.pushSubscriptions.id });
  return rows.length > 0;
}

export async function touchSubscription(endpoint: string): Promise<void> {
  if (!db) return;
  await db
    .update(schema.pushSubscriptions)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(schema.pushSubscriptions.endpoint, endpoint));
}
