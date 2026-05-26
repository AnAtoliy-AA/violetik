import { NextResponse } from "next/server";
import { getBookingById } from "@/db/bookings";
import { loadServiceByIdForLocale } from "@/entities/service/api/load";
import { studioLocationLine } from "@/entities/site-settings";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { buildIcsEvent } from "@/shared/lib/calendar/build-ics";
import { routing, type Locale } from "@/i18n/routing";

/**
 * GET /api/booking/{id}/ics?locale=en
 *
 * Returns an RFC 5545 .ics file for the given booking so the
 * confirmation page's "Apple" / "ICS" calendar chips have something
 * real to download. 404s when the booking row is missing or the DB is
 * unreachable. No auth gate — the booking id is opaque (\`bk_<hex16>\`)
 * and revealing the start time of an existing reservation is the
 * deliberate point of this endpoint.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!id || !id.startsWith("bk_")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const booking = await getBookingById(id);
  if (!booking) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale = (
    localeParam && (routing.locales as readonly string[]).includes(localeParam)
      ? localeParam
      : routing.defaultLocale
  ) as Locale;

  const [service, settings] = await Promise.all([
    loadServiceByIdForLocale(booking.serviceId, locale),
    getSiteSettingsServer(),
  ]);

  const summary = service?.name
    ? `Violetta · ${service.name}`
    : "Violetta · Booking";
  const location = studioLocationLine(settings, locale);
  const description = `Reservation code: ${id.replace(/^bk_/, "").slice(0, 4).toUpperCase()}\nDuration: ${booking.durationMinutes} min`;

  const ics = buildIcsEvent({
    uid: id,
    start: booking.scheduledFor,
    durationMinutes: booking.durationMinutes,
    summary,
    location,
    description,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"violetta-${id}.ics\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
