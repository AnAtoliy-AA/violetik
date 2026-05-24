export const NOTIFICATION_CATEGORIES = [
  "booking_created",
  "booking_confirmed",
  "booking_cancelled",
  "booking_reminder_24h",
  "vip_decision",
  "vip_request_submitted",
  "testimonial_decision",
  "testimonial_submitted",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const ADMIN_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  "booking_created",
  "vip_request_submitted",
  "testimonial_submitted",
]);

/**
 * Dispatcher input. `titleKey` and `bodyKey` are i18n keys under the
 * `Notifications` namespace; `bodyParams` interpolates into them
 * server-side using the recipient's `preferred_locale`. `url` is the
 * deep-link the SW opens on notificationclick. `meta` is opaque
 * structured data persisted into notification_log.payload.
 */
export interface NotificationPayload {
  titleKey: string;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  url: string;
  meta?: Record<string, unknown>;
}
