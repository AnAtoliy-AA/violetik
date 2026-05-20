"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getBookingById, setBookingStatus } from "@/db/bookings";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  deleteCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.id);
}

/**
 * Marks a pending booking confirmed. The GCal event was already
 * created at submit-time so the slot stays blocked — only the DB
 * status moves.
 */
export async function confirmBooking(bookingId: string): Promise<void> {
  if (!(await requireAdmin())) return;
  await setBookingStatus(bookingId, "confirmed");
  revalidatePath("/", "layout");
}

/**
 * Marks a booking cancelled and removes its GCal event so the slot
 * becomes available again.
 */
export async function declineBooking(bookingId: string): Promise<void> {
  if (!(await requireAdmin())) return;
  const booking = await getBookingById(bookingId);
  if (!booking) return;

  await setBookingStatus(bookingId, "cancelled");

  if (booking.gcalEventId) {
    try {
      const token = await getActiveGoogleToken();
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (token && clientId && clientSecret) {
        const { accessToken } = await refreshAccessToken({
          clientId,
          clientSecret,
          refreshToken: token.refreshToken,
        });
        await deleteCalendarEvent({
          calendarId: token.calendarId,
          eventId: booking.gcalEventId,
          accessToken,
        });
      }
    } catch (err) {
      console.warn(
        "[declineBooking] GCal delete failed; status flipped anyway:",
        err,
      );
    }
  }
  revalidatePath("/", "layout");
}
