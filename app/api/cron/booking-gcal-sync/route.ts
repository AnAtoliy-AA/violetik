import { NextResponse } from "next/server";
import {
  listPendingBookingsWithGcalEvent,
  setBookingStatus,
} from "@/db/bookings";
import {
  getActiveGoogleToken,
  updateLastRefresh,
} from "@/db/google-tokens";
import {
  getCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import { dispatchNotification } from "@/shared/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

/**
 * Daily safety-net: for each recent pending booking with a GCal event,
 * read the event and promote the booking to confirmed when the admin
 * marked the calendar event confirmed. Idempotent (only flips pending →
 * confirmed); best-effort per row so one failure doesn't stop the rest.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const bookings = await listPendingBookingsWithGcalEvent();
  if (bookings.length === 0) {
    return NextResponse.json({ examined: 0, confirmed: 0 });
  }

  const token = await getActiveGoogleToken();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!token || !clientId || !clientSecret) {
    return NextResponse.json({
      examined: bookings.length,
      confirmed: 0,
      skipped: "no_gcal_token",
    });
  }

  let accessToken: string;
  try {
    ({ accessToken } = await refreshAccessToken({
      clientId,
      clientSecret,
      refreshToken: token.refreshToken,
    }));
    await updateLastRefresh(token.userId);
  } catch (err) {
    console.warn("[booking-gcal-sync] token refresh failed:", err);
    return NextResponse.json({
      examined: bookings.length,
      confirmed: 0,
      skipped: "token_refresh_failed",
    });
  }

  let confirmed = 0;
  for (const b of bookings) {
    if (!b.gcalEventId) continue;
    try {
      const evt = await getCalendarEvent({
        calendarId: token.calendarId,
        eventId: b.gcalEventId,
        accessToken,
      });
      if (evt?.status === "confirmed") {
        await setBookingStatus(b.id, "confirmed");
        confirmed += 1;
        await dispatchNotification(b.userId, "booking_confirmed", {
          titleKey: "category_booking_confirmed_push_title",
          bodyKey: "category_booking_confirmed_push_body",
          url: "/profile",
          meta: {
            bookingId: b.id,
            scheduledFor: b.scheduledFor.toISOString(),
          },
        });
      }
    } catch (err) {
      console.warn(
        `[booking-gcal-sync] sync failed for booking ${b.id}:`,
        err,
      );
    }
  }

  return NextResponse.json({ examined: bookings.length, confirmed });
}
