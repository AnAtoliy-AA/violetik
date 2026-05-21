import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * One row per Telegram user who has ever signed in. The Auth.js
 * Credentials provider in `auth.ts` upserts here on every sign-in,
 * so we always have a record of who's interacting with the booking
 * flow — even though sessions themselves are JWT-only.
 *
 * Role defaults to "customer". Promote Violetta to "admin" manually
 * once you know her Telegram id (visible in the `users` table after
 * her first sign-in).
 */
export const userRole = pgEnum("user_role", ["customer", "admin"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // "tg:<telegram_id>" or "google:<sub>"
    telegramId: bigint("telegram_id", { mode: "number" }).unique(),
    googleSub: text("google_sub").unique(),
    email: text("email"),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    photoUrl: text("photo_url"),
    role: userRole("role").notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
  },
  (table) => ({
    telegramIdx: index("users_telegram_id_idx").on(table.telegramId),
    googleSubIdx: index("users_google_sub_idx").on(table.googleSub),
  }),
);

/**
 * Recurring weekly availability windows. dayOfWeek 0 = Sunday … 6 = Saturday
 * to match JavaScript's Date#getDay(). startTime / endTime are stored as
 * "HH:MM" strings so they're trivially serializable and timezone-free —
 * timezone interpretation happens when the booking page renders slots.
 */
export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: text("id").primaryKey(),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    dayIdx: index("availability_day_idx").on(table.dayOfWeek),
  }),
);

/**
 * Bookings. `gcalEventId` is populated once the corresponding event is
 * written to the studio's Google Calendar (PR 4 wires this); null in the
 * meantime. serviceId is intentionally **not** a FK — services are
 * content, not DB rows (see `entities/studio/model/data.ts`).
 */
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceId: text("service_id").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: bookingStatus("status").notNull().default("pending"),
    gcalEventId: text("gcal_event_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("bookings_user_idx").on(table.userId),
    scheduledIdx: index("bookings_scheduled_idx").on(table.scheduledFor),
    statusIdx: index("bookings_status_idx").on(table.status),
    // One active booking per slot. Partial unique so 'cancelled'
    // bookings can pile up at the same scheduled_for without blocking
    // the slot.
    scheduledActiveUniq: uniqueIndex("bookings_scheduled_for_active_uniq")
      .on(table.scheduledFor)
      .where(sql`status <> 'cancelled'`),
  }),
);

export const vipRequestStatus = pgEnum("vip_request_status", [
  "pending",
  "approved",
  "declined",
  "cancelled",
]);

export const vipRequests = pgTable(
  "vip_requests",
  {
    id: text("id").primaryKey(), // "vipreq_" + 16 hex
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: vipRequestStatus("status").notNull().default("pending"),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id),
    declineReason: text("decline_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("vip_requests_user_idx").on(table.userId),
    statusIdx: index("vip_requests_status_idx").on(table.status),
    pendingUniq: uniqueIndex("vip_requests_one_pending_per_user")
      .on(table.userId)
      .where(sql`status = 'pending'`),
    activeExpiryIdx: index("vip_requests_active_expiry_idx")
      .on(table.expiresAt)
      .where(sql`status = 'approved'`),
  }),
);

export type VipRequest = typeof vipRequests.$inferSelect;
export type NewVipRequest = typeof vipRequests.$inferInsert;

/**
 * One row per admin who has connected their Google Calendar via OAuth.
 * v1 ships single-admin only; the table supports multi-admin already
 * (PK is userId, queries pick "most recent connectedAt"). Refresh
 * token is stored plaintext — relies on Supabase RLS + service-role-
 * only access. See docs/superpowers/specs/2026-05-20-google-calendar-
 * integration-design.md §8.
 */
export const googleOauthTokens = pgTable("google_oauth_tokens", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  calendarId: text("calendar_id").notNull().default("primary"),
  scope: text("scope").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  lastRefreshAt: timestamp("last_refresh_at", { withTimezone: true }),
});

/**
 * Singleton row carrying admin-controlled, site-wide defaults:
 * default palette (applied to visitors with no cookie), default
 * locale (used by the proxy for bare `/` redirects), per-service
 * and VIP-tier price overrides, and a global discount percentage.
 *
 * The CHECK constraint guarantees at most one row. See
 * docs/superpowers/specs/2026-05-21-admin-site-settings-design.md §3.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: text("id").primaryKey().default("singleton"),
    defaultPalette: text("default_palette").notNull().default("aubergine"),
    defaultLocale: text("default_locale").notNull().default("en"),
    priceOverrides: jsonb("price_overrides")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    discountPercent: integer("discount_percent").notNull().default(0),
    discountActive: boolean("discount_active").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    singleton: check(
      "site_settings_singleton",
      sql`${table.id} = 'singleton'`,
    ),
    discountRange: check(
      "site_settings_discount_range",
      sql`${table.discountPercent} BETWEEN 0 AND 90`,
    ),
  }),
);

/**
 * Each row stores one customer-facing photograph the admin has uploaded
 * through `/admin/photos`. The pair (slotKind, slotId) is unique — the
 * second upload for a given slot replaces the first row (and the prior
 * Vercel Blob is deleted server-side).
 *
 * The `src` is the public Vercel Blob URL; `width` / `height` come from
 * the upload form (read from the file's natural dimensions before submit).
 * `blurDataURL` is reserved for a future plaiceholder pass; nullable today.
 */
export const photoSlotKind = pgEnum("photo_slot_kind", [
  "service",
  "gallery",
  "atelier",
  "master",
  "testimonial",
  "profile",
]);

export const studioPhotos = pgTable(
  "studio_photos",
  {
    id: text("id").primaryKey(),
    slotKind: photoSlotKind("slot_kind").notNull(),
    slotId: text("slot_id").notNull(),
    src: text("src").notNull(),
    alt: text("alt"),
    width: integer("width"),
    height: integer("height"),
    blurDataUrl: text("blur_data_url"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    uploadedBy: text("uploaded_by").references(() => users.id),
  },
  (table) => ({
    uniqueSlot: uniqueIndex("studio_photos_slot_uq").on(
      table.slotKind,
      table.slotId,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type NewAvailabilityRule = typeof availabilityRules.$inferInsert;
export type GoogleOauthToken = typeof googleOauthTokens.$inferSelect;
export type NewGoogleOauthToken = typeof googleOauthTokens.$inferInsert;
export type SiteSettingsRow = typeof siteSettings.$inferSelect;
export type NewSiteSettingsRow = typeof siteSettings.$inferInsert;
export type StudioPhotoRow = typeof studioPhotos.$inferSelect;
export type NewStudioPhotoRow = typeof studioPhotos.$inferInsert;
export type PhotoSlotKind = (typeof photoSlotKind.enumValues)[number];
