"use server";

import { revalidatePath } from "next/cache";
import { canSelfCancel } from "@/entities/booking";
import {
  cancelBookingIfOpen,
  getBookingById,
} from "@/db/bookings";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getActiveGoogleToken } from "@/db/google-tokens";
import { deleteCalendarEvent, refreshAccessToken } from "@/shared/lib/google-calendar";
import { dispatchNotification } from "@/shared/lib/notifications";

export type CancelBookingResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "not_found"
        | "not_owner"
        | "too_late"
        | "already_cancelled"
        | "unknown";
    };

export async function cancelBookingAction(
  bookingId: string,
): Promise<CancelBookingResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, reason: "not_found" };
    if (booking.userId !== user.id) return { ok: false, reason: "not_owner" };
    if (booking.status === "cancelled" || booking.status === "completed") {
      return { ok: false, reason: "already_cancelled" };
    }
    if (!canSelfCancel(new Date(), booking.scheduledFor)) {
      return { ok: false, reason: "too_late" };
    }

    const cancelled = await cancelBookingIfOpen(bookingId);
    if (!cancelled) {
      return { ok: false, reason: "already_cancelled" };
    }

    if (cancelled.gcalEventId) {
      // Best-effort GCal cleanup — verbatim from
      // features/bookings-admin/api/actions.ts:32 (declineBooking).
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
            eventId: cancelled.gcalEventId,
            accessToken,
          });
        }
      } catch (err) {
        console.warn(
          "[cancelBookingAction] GCal delete failed; status flipped anyway:",
          err,
        );
      }
    }

    // Surface to the user's other devices so any open booking screens
    // refresh and the customer sees a confirmation push.
    await dispatchNotification(user.id, "booking_cancelled", {
      titleKey: "category_booking_cancelled_push_title",
      bodyKey: "category_booking_cancelled_push_body",
      url: "/profile",
      meta: {
        bookingId: cancelled.id,
        scheduledFor: cancelled.scheduledFor.toISOString(),
      },
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[cancelBookingAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}
