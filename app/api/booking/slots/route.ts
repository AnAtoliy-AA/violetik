import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZoneFromSettings,
  computeAvailableSlots,
  fetchBusyWindows,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import {
  getActiveGoogleToken,
  updateLastRefresh,
} from "@/db/google-tokens";
import { listActiveBookingsFrom } from "@/db/bookings";
import { getServiceById } from "@/db/services";
import { MIN_BOOKING_LEAD_MINUTES } from "@/views/booking/lib/booking-steps";
import { slotCache } from "./cache";

const DEFAULT_DURATION_MIN = 60;
const REFRESH_THRESHOLD_MS = 50 * 60_000;

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const dayISO = url.searchParams.get("date");
  const serviceId = url.searchParams.get("serviceId");
  if (!dayISO || !serviceId) {
    return Response.json({ error: "missing_params" }, { status: 400 });
  }

  const now = new Date();

  const [service, settings] = await Promise.all([
    getServiceById(serviceId),
    getSiteSettingsServer(),
  ]);
  const durationMin = service?.durationMinutes ?? DEFAULT_DURATION_MIN;
  const tz = bookingTimeZoneFromSettings(settings);
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const cacheKey = `${calendarId}:${dayISO}:${durationMin}`;
  const cached = slotCache.get(cacheKey);
  if (cached) {
    return Response.json({ source: "cache", slots: cached });
  }

  // Bookings in the DB also block their slot — covers the window
  // between submitBooking() inserting the row and the GCal event
  // syncing (or the case where GCal sync fails entirely).
  const dayStart = new Date(`${dayISO}T00:00:00Z`);
  const dayEnd = new Date(`${dayISO}T23:59:59Z`);
  const dbBookings = (await listActiveBookingsFrom(dayStart)).filter(
    (b) => b.scheduledFor <= dayEnd,
  );
  const dbBusy = dbBookings.map((b) => ({
    start: b.scheduledFor,
    end: new Date(b.scheduledFor.getTime() + b.durationMinutes * 60_000),
  }));

  const token = await getActiveGoogleToken();
  if (!token) {
    const slots = computeAvailableSlots({
      workingHours: WEEKLY_DEFAULT_HOURS,
      busy: dbBusy,
      serviceDurationMin: durationMin,
      dayISO,
      timeZone: tz,
      now,
      minLeadMinutes: MIN_BOOKING_LEAD_MINUTES,
    });
    slotCache.set(cacheKey, slots);
    return Response.json({ source: "static", slots });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("env_missing");

    // Access tokens are not persisted, so every cache miss does a
    // refresh. lastRefreshAt is bookkeeping only — bump it at most
    // once per REFRESH_THRESHOLD_MS to avoid a write per request.
    const { accessToken: liveAccess } = await refreshAccessToken({
      clientId,
      clientSecret,
      refreshToken: token.refreshToken,
    });
    const shouldBumpLastRefresh =
      !token.lastRefreshAt ||
      Date.now() - token.lastRefreshAt.getTime() > REFRESH_THRESHOLD_MS;
    if (shouldBumpLastRefresh) await updateLastRefresh(token.userId);

    const rangeStart = new Date(`${dayISO}T00:00:00Z`);
    const rangeEnd = new Date(`${dayISO}T23:59:59Z`);
    const busy = await fetchBusyWindows({
      calendarId: token.calendarId,
      rangeStart,
      rangeEnd,
      accessToken: liveAccess,
    });

    const slots = computeAvailableSlots({
      workingHours: WEEKLY_DEFAULT_HOURS,
      busy: [...busy, ...dbBusy],
      serviceDurationMin: durationMin,
      dayISO,
      timeZone: tz,
      now,
      minLeadMinutes: MIN_BOOKING_LEAD_MINUTES,
    });
    slotCache.set(cacheKey, slots);
    return Response.json({ source: "gcal", slots });
  } catch (err) {
    console.warn("[booking/slots] falling back to static:", err);
    const slots = computeAvailableSlots({
      workingHours: WEEKLY_DEFAULT_HOURS,
      busy: dbBusy,
      serviceDurationMin: durationMin,
      dayISO,
      timeZone: tz,
      now,
      minLeadMinutes: MIN_BOOKING_LEAD_MINUTES,
    });
    return Response.json({ source: "static-fallback", slots });
  }
}
