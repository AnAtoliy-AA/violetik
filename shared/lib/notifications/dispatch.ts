import "server-only";
import webpush from "web-push";
import { getTranslations } from "next-intl/server";
import { getUserById } from "@/db/users";
import { getNotificationPreferences } from "@/db/notification-preferences";
import {
  listSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
  touchSubscription,
} from "@/db/push-subscriptions";
import { recordNotification } from "@/db/notification-log";
import {
  ADMIN_CATEGORIES,
  type NotificationCategory,
  type NotificationPayload,
} from "./types";

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !sub) return false;
  webpush.setVapidDetails(sub, pub, priv);
  vapidConfigured = true;
  return true;
}

/**
 * Fire-and-forget by convention — the function returns void and never
 * throws to the caller. Every failure path writes a notification_log
 * row so dispatch behavior is auditable post hoc.
 *
 * Booking flows must not break on a notification failure; the outer
 * try/catch is the firewall.
 */
export async function dispatchNotification(
  userId: string,
  category: NotificationCategory,
  payload: NotificationPayload,
): Promise<void> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      await recordNotification({
        userId,
        category,
        payload: { ...payload, reason: "user_missing" },
        status: "skipped_prefs",
        error: null,
      });
      return;
    }

    const prefs = await getNotificationPreferences(userId);
    if (prefs[category] !== true) {
      await recordNotification({
        userId,
        category,
        payload: { ...payload, reason: "category_off" },
        status: "skipped_prefs",
        error: null,
      });
      return;
    }

    if (ADMIN_CATEGORIES.has(category) && user.role !== "admin") {
      await recordNotification({
        userId,
        category,
        payload: { ...payload, reason: "not_admin" },
        status: "skipped_prefs",
        error: null,
      });
      return;
    }

    const subs = await listSubscriptionsByUser(userId);
    if (subs.length === 0) {
      await recordNotification({
        userId,
        category,
        payload,
        status: "no_subscriptions",
        error: null,
      });
      return;
    }

    if (!configureVapid()) {
      await recordNotification({
        userId,
        category,
        payload,
        status: "all_failed",
        error: "vapid_not_configured",
      });
      return;
    }

    const locale = user.preferredLocale ?? "en";
    const t = await getTranslations({ locale, namespace: "Notifications" });
    const title = t(payload.titleKey, payload.bodyParams ?? {});
    const body = t(payload.bodyKey, payload.bodyParams ?? {});
    const pushBody = JSON.stringify({
      title,
      body,
      url: payload.url,
      tag: category,
    });

    let anySuccess = false;
    let lastErr: string | null = null;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushBody,
        );
        anySuccess = true;
        await touchSubscription(sub.endpoint);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
        }
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }

    await recordNotification({
      userId,
      category,
      payload: { ...(payload.meta ?? {}), ...payload },
      status: anySuccess ? "sent" : "all_failed",
      error: anySuccess ? null : lastErr,
    });
  } catch (err) {
    console.error(
      "[dispatchNotification] unexpected error for user=%s category=%s: %o",
      userId,
      category,
      err,
    );
  }
}
