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
  primaryKey,
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
    masterId: text("master_id").references(() => masters.id, {
      onDelete: "restrict",
    }),
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
    masterIdx: index("bookings_master_idx").on(table.masterId),
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
 * Lifecycle states for services and service categories. `draft` and
 * `archived` are admin-only; only `published` rows are visible on the
 * public menu. See docs/superpowers/specs/2026-05-22-admin-services-management-design.md §3.
 */
export const serviceStatus = pgEnum("service_status", [
  "draft",
  "published",
  "archived",
]);

/**
 * The site-wide display currency lives as a single value on the
 * `site_settings` singleton (column added in this same migration).
 * Currency is a display label — no FX conversion. See spec §2 / §3.4.
 */
export const currencyCode = pgEnum("currency_code", [
  "EUR",
  "USD",
  "BYN",
  "RUB",
]);

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
    currency: currencyCode("currency").notNull().default("EUR"),
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

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: text("id").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    nameBe: text("name_be").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: serviceStatus("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    sortIdx: index("service_categories_sort_idx").on(table.sortOrder),
    statusIdx: index("service_categories_status_idx").on(table.status),
  }),
);

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "restrict" }),
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    nameBe: text("name_be").notNull(),
    blurbEn: text("blurb_en").notNull(),
    blurbRu: text("blurb_ru").notNull(),
    blurbBe: text("blurb_be").notNull(),
    includes: jsonb("includes")
      .$type<Array<{ en: string; ru: string; be: string }>>()
      .notNull()
      .default([]),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: serviceStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    categoryIdx: index("services_category_idx").on(table.categoryId),
    sortIdx: index("services_sort_idx").on(table.sortOrder),
    statusIdx: index("services_status_idx").on(table.status),
    includesMax8: check(
      "services_includes_max_8",
      sql`jsonb_array_length(${table.includes}) <= 8`,
    ),
    pricePositive: check(
      "services_price_non_negative",
      sql`${table.priceCents} >= 0`,
    ),
    durationPositive: check(
      "services_duration_positive",
      sql`${table.durationMinutes} > 0`,
    ),
  }),
);

/**
 * Lifecycle states for masters. Mirrors `serviceStatus`. `draft` and
 * `archived` are admin-only; only `published` rows are visible on
 * /master, on the booking step, and counted by auto-skip logic.
 * See docs/superpowers/specs/2026-05-22-admin-masters-management-design.md §2.1.
 */
export const masterStatus = pgEnum("master_status", [
  "draft",
  "published",
  "archived",
]);

export const masters = pgTable("masters", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameRu: text("name_ru").notNull(),
  nameBe: text("name_be").notNull(),
  roleEn: text("role_en").notNull(),
  roleRu: text("role_ru").notNull(),
  roleBe: text("role_be").notNull(),
  bioEn: text("bio_en").notNull(),
  bioRu: text("bio_ru").notNull(),
  bioBe: text("bio_be").notNull(),
  quoteEn: text("quote_en").notNull(),
  quoteRu: text("quote_ru").notNull(),
  quoteBe: text("quote_be").notNull(),
  years: integer("years").notNull().default(0),
  setsLabel: text("sets_label").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  status: masterStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/**
 * Many-to-many specialty join: `(master_id, service_id)` pairs mark
 * which services a master performs. Used by the booking step to filter
 * eligible masters and by listPublishedServices() to hide orphan
 * services from the public menu.
 */
export const masterServices = pgTable(
  "master_services",
  {
    masterId: text("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.masterId, t.serviceId] }),
    masterIdx: index("master_services_master_idx").on(t.masterId),
    serviceIdx: index("master_services_service_idx").on(t.serviceId),
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
export type ServiceCategoryRow = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceStatus = (typeof serviceStatus.enumValues)[number];
export type CurrencyCode = (typeof currencyCode.enumValues)[number];
export type Master = typeof masters.$inferSelect;
export type NewMaster = typeof masters.$inferInsert;
export type MasterServiceRow = typeof masterServices.$inferSelect;
export type MasterStatus = (typeof masterStatus.enumValues)[number];
