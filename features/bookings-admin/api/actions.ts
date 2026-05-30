"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getBookingById, setBookingStatus } from "@/db/bookings";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  deleteCalendarEvent,
  refreshAccessToken,
  setCalendarEventStatus,
} from "@/shared/lib/google-calendar";
import { dispatchNotification } from "@/shared/lib/notifications";

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.id);
}

/**
 * Marks a pending booking confirmed and best-effort patches the GCal event
 * to confirmed so both in-app and calendar stay in sync.
 */
export async function confirmBooking(bookingId: string): Promise<void> {
  if (!(await requireAdmin())) return;
  await setBookingStatus(bookingId, "confirmed");

  const booking = await getBookingById(bookingId);

  if (booking?.gcalEventId) {
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
        await setCalendarEventStatus({
          calendarId: token.calendarId,
          eventId: booking.gcalEventId,
          accessToken,
          status: "confirmed",
        });
      }
    } catch (err) {
      console.warn(
        "[confirmBooking] GCal status patch failed; DB already confirmed:",
        err,
      );
    }
  }

  if (booking) {
    await dispatchNotification(booking.userId, "booking_confirmed", {
      titleKey: "category_booking_confirmed_push_title",
      bodyKey: "category_booking_confirmed_push_body",
      url: "/profile",
      meta: { bookingId, scheduledFor: booking.scheduledFor.toISOString() },
    });
  }
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

  await dispatchNotification(booking.userId, "booking_cancelled", {
    titleKey: "category_booking_cancelled_push_title",
    bodyKey: "category_booking_cancelled_push_body",
    url: "/profile",
    meta: { bookingId, scheduledFor: booking.scheduledFor.toISOString() },
  });
  revalidatePath("/", "layout");
}
