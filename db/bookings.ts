import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db, schema } from "./index";

export interface NewBookingInput {
  userId: string;
  serviceId: string;
  scheduledFor: Date;
  durationMinutes: number;
  notes?: string | null;
}

export interface BookingWithUser extends schema.Booking {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
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
  const rows = await db
    .select({
      booking: schema.bookings,
      userEmail: schema.users.email,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      username: schema.users.username,
    })
    .from(schema.bookings)
    .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
    .orderBy(desc(schema.bookings.scheduledFor));
  return rows.map((r) => ({
    ...r.booking,
    userEmail: r.userEmail,
    userFirstName: r.userFirstName,
    userLastName: r.userLastName,
    username: r.username,
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
