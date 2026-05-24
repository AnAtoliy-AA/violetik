import { NextResponse } from "next/server";
import { listBookingsDueForReminder } from "@/db/bookings";
import { getServiceById } from "@/db/services";
import { hasRecentBookingReminder } from "@/db/notification-log";
import { dispatchNotification } from "@/shared/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Vercel Cron hits this endpoint hourly. Auth in production is via
 * the platform-injected CRON_SECRET; in development the auth check is
 * relaxed so the route can be exercised with curl.
 */
function authorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = req.headers.get("authorization") ?? "";
  return got === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });

  const bookings = await listBookingsDueForReminder();
  let sent = 0;
  let skipped = 0;
  for (const b of bookings) {
    if (await hasRecentBookingReminder(b.id)) {
      skipped += 1;
      continue;
    }
    // Resolve the service name so the push reads "Reminder: Signature
    // Manicure tomorrow." instead of leaking the raw service id.
    const service = await getServiceById(b.serviceId);
    const serviceName = service?.nameEn ?? "your appointment";

    await dispatchNotification(b.userId, "booking_reminder_24h", {
      titleKey: "category_booking_reminder_24h_push_title",
      bodyKey: "category_booking_reminder_24h_push_body",
      bodyParams: { service: serviceName },
      url: "/profile",
      meta: { bookingId: b.id, scheduledFor: b.scheduledFor.toISOString() },
    });
    sent += 1;
  }
  return NextResponse.json({ examined: bookings.length, sent, skipped });
}
