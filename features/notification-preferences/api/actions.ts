"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import {
  saveSubscription,
  deleteSubscriptionByEndpoint,
} from "@/db/push-subscriptions";
import { setNotificationPreference } from "@/db/notification-preferences";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/shared/lib/notifications/types";

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid_category" | "db_error" };

export interface SaveSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

export async function savePushSubscriptionAction(
  input: SaveSubscriptionInput,
): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const row = await saveSubscription({
    userId: user.id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent,
  });
  if (!row) return { ok: false, reason: "db_error" };
  revalidatePath("/[locale]/profile/notifications", "page");
  return { ok: true };
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  await deleteSubscriptionByEndpoint(endpoint);
  revalidatePath("/[locale]/profile/notifications", "page");
  return { ok: true };
}

const CATEGORY_SET = new Set<string>(NOTIFICATION_CATEGORIES);

export async function toggleCategoryAction(
  category: NotificationCategory,
  enabled: boolean,
): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  if (!CATEGORY_SET.has(category)) {
    return { ok: false, reason: "invalid_category" };
  }
  await setNotificationPreference(user.id, category, enabled);
  revalidatePath("/[locale]/profile/notifications", "page");
  return { ok: true };
}
