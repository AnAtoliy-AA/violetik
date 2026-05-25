import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { activeVipSubquery } from "./vip-requests";

export interface NewBookingInput {
  userId: string;
  serviceId: string;
  masterId: string;
  scheduledFor: Date;
  durationMinutes: number;
  notes?: string | null;
}

export interface BookingWithUser extends schema.Booking {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
  userIsVip: boolean;
  masterNameEn: string | null;
  masterNameRu: string | null;
  masterNameBy: string | null;
}

function generateBookingId(): string {
  return `bk_${randomBytes(8).toString("hex")}`;
}

/**
 * Inserts a new booking row with status='pending'. Returns null if the
 * DB isn't configured. Throws on unique-index conflict (slot already
 * has a non-cancelled booking) — caller maps that to a user-facing
 * "slot taken" error.
 */
export async function createBooking(
  input: NewBookingInput,
): Promise<schema.Booking | null> {
  if (!db) return null;
  const id = generateBookingId();
  const rows = await db
    .insert(schema.bookings)
    .values({
      id,
      userId: input.userId,
      serviceId: input.serviceId,
      masterId: input.masterId,
      scheduledFor: input.scheduledFor,
      durationMinutes: input.durationMinutes,
      notes: input.notes ?? null,
    })
    .returning();
  return rows[0] ?? null;
}

export async function getBookingById(
  id: string,
): Promise<schema.Booking | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Lists every active (non-cancelled) booking from now onwards. Used by
 * the slots API to subtract bookings already in flight even if their
 * GCal sync hasn't happened yet.
 */
export async function listActiveBookingsFrom(
  since: Date,
): Promise<schema.Booking[]> {
  if (!db) return [];
  return db
    .select()
    .from(schema.bookings)
    .where(
      and(
        gte(schema.bookings.scheduledFor, since),
        ne(schema.bookings.status, "cancelled"),
      ),
    );
}

/**
 * Admin-facing list: every booking, newest first, with a small profile
 * snapshot of the booker joined in.
 */
export async function listBookingsForAdmin(): Promise<BookingWithUser[]> {
  if (!db) return [];
  const activeVip = activeVipSubquery();
  const rows = await db
    .select({
      booking: schema.bookings,
      userEmail: schema.users.email,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      username: schema.users.username,
      vipUserId: activeVip.userId,
      masterNameEn: schema.masters.nameEn,
      masterNameRu: schema.masters.nameRu,
      masterNameBy: schema.masters.nameBy,
    })
    .from(schema.bookings)
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .leftJoin(activeVip, eq(activeVip.userId, schema.bookings.userId))
    .leftJoin(schema.masters, eq(schema.bookings.masterId, schema.masters.id))
    .orderBy(desc(schema.bookings.scheduledFor));
  return rows.map((r) => ({
    ...r.booking,
    userEmail: r.userEmail,
    userFirstName: r.userFirstName,
    userLastName: r.userLastName,
    username: r.username,
    userIsVip: r.vipUserId !== null,
    masterNameEn: r.masterNameEn,
    masterNameRu: r.masterNameRu,
    masterNameBy: r.masterNameBy,
  }));
}

export async function setBookingStatus(
  id: string,
  status: "pending" | "confirmed" | "cancelled" | "completed",
): Promise<schema.Booking | null> {
  if (!db) return null;
  const rows = await db
    .update(schema.bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.bookings.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function setBookingGcalEventId(
  id: string,
  gcalEventId: string,
): Promise<void> {
  if (!db) return;
  await db
    .update(schema.bookings)
    .set({ gcalEventId, updatedAt: new Date() })
    .where(eq(schema.bookings.id, id));
}

export interface UserBookingRow extends schema.Booking {
  masterNameEn: string | null;
  masterNameRu: string | null;
  masterNameBy: string | null;
  masterTelegramUsername: string | null;
}

/**
 * Bookings for one user, excluding cancelled rows. Sorted ascending
 * by scheduledFor; the view buckets into upcoming / history using a
 * single `now` captured server-side.
 */
export async function listUserBookings(
  userId: string,
): Promise<UserBookingRow[]> {
  if (!db) return [];
  const rows = await db
    .select({
      booking: schema.bookings,
      masterNameEn: schema.masters.nameEn,
      masterNameRu: schema.masters.nameRu,
      masterNameBy: schema.masters.nameBy,
      masterTelegramUsername: schema.masters.telegramUsername,
    })
    .from(schema.bookings)
    .leftJoin(
      schema.masters,
      eq(schema.bookings.masterId, schema.masters.id),
    )
    .where(
      and(
        eq(schema.bookings.userId, userId),
        ne(schema.bookings.status, "cancelled"),
      ),
    )
    .orderBy(asc(schema.bookings.scheduledFor));
  return rows.map((r) => ({
    ...r.booking,
    masterNameEn: r.masterNameEn,
    masterNameRu: r.masterNameRu,
    masterNameBy: r.masterNameBy,
    masterTelegramUsername: r.masterTelegramUsername,
  }));
}

/**
 * Race-safe customer cancel: only flips the row when its current
 * status is pending or confirmed. Returns the updated row when the
 * update happened, or null when nothing was updated (already cancelled
 * / completed / no such row / DB disabled).
 */
export async function cancelBookingIfOpen(
  id: string,
): Promise<schema.Booking | null> {
  if (!db) return null;
  const rows = await db
    .update(schema.bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(schema.bookings.id, id),
        sql`${schema.bookings.status} IN ('pending','confirmed')`,
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * Confirmed bookings scheduled within the next 36 h. Vercel Hobby tier
 * caps crons at once-per-day; pairing a 36-hour lookahead with the
 * 48-hour notification_log dedup guarantees each booking gets exactly
 * one reminder regardless of when the cron tick lands relative to the
 * booking time.
 */
export async function listBookingsDueForReminder(): Promise<schema.Booking[]> {
  if (!db) return [];
  return db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        sql`${schema.bookings.scheduledFor} BETWEEN now() AND now() + interval '36 hours'`,
      ),
    );
}
