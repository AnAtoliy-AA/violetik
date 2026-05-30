import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { activeVipSubquery } from "./vip-requests";

/**
 * Bookings created before this date predate the tentative-on-create
 * behaviour; their GCal events default to "confirmed" in Google, so the
 * confirm-sync cron must ignore them to avoid mass auto-confirmation.
 * Set to the feature ship date.
 */
export const GCAL_SYNC_CUTOFF = new Date("2026-05-30T00:00:00Z");

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
 * Per-service count of confirmed + completed bookings. Backs §5.2's
 * "pin the most-booked" signatures rerank and §11.3's "N sittings"
 * line on each service tile. Cancelled + pending bookings excluded so
 * the count reflects realised demand, not interest.
 */
export type CountedBookingStatus = "confirmed" | "completed";

export async function countBookingsByServiceId(
  statuses: ReadonlyArray<CountedBookingStatus> = ["confirmed", "completed"],
): Promise<ReadonlyMap<string, number>> {
  if (!db) return new Map();
  if (statuses.length === 0) return new Map();
  const rows = await db
    .select({
      serviceId: schema.bookings.serviceId,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.bookings)
    .where(inArray(schema.bookings.status, [...statuses]))
    .groupBy(schema.bookings.serviceId);
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.serviceId, r.count);
  return out;
}

/**
 * Count of bookings with status = 'pending'. Used by the admin
 * polling endpoint to drive the "N new" badge cheaply.
 */
export async function countPendingBookings(): Promise<number> {
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(eq(schema.bookings.status, "pending"));
  return rows[0]?.count ?? 0;
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
 * All bookings for one user (all statuses, including cancelled). Sorted
 * ascending by scheduledFor; the view buckets into upcoming / history
 * using a single `now` captured server-side.
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
    .where(eq(schema.bookings.userId, userId))
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
 * Pending, future bookings that have a GCal event and were created on or
 * after GCAL_SYNC_CUTOFF. Backs the daily confirm-sync cron: it reads
 * each event and promotes the row to confirmed when the admin marked the
 * calendar event confirmed.
 */
export async function listPendingBookingsWithGcalEvent(
  cutoff: Date = GCAL_SYNC_CUTOFF,
): Promise<schema.Booking[]> {
  if (!db) return [];
  return db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "pending"),
        gte(schema.bookings.createdAt, cutoff),
        gte(schema.bookings.scheduledFor, new Date()),
        sql`${schema.bookings.gcalEventId} IS NOT NULL`,
      ),
    );
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
