import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
    id: text("id").primaryKey(), // "tg:<telegram_id>"
    telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
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
  }),
);

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type NewAvailabilityRule = typeof availabilityRules.$inferInsert;
export type GoogleOauthToken = typeof googleOauthTokens.$inferSelect;
export type NewGoogleOauthToken = typeof googleOauthTokens.$inferInsert;
