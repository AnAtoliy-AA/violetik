import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZone,
  computeAvailableSlots,
  fetchBusyWindows,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import {
  getActiveGoogleToken,
  updateLastRefresh,
} from "@/db/google-tokens";
import { STUDIO_DATA } from "@/entities/studio";
import { slotCache } from "./cache";

const DEFAULT_DURATION_MIN = 60;
const REFRESH_THRESHOLD_MS = 50 * 60_000;

function parseDurationMin(durationLabel: string | undefined): number {
  if (!durationLabel) return DEFAULT_DURATION_MIN;
  const m = /^(\d+)\s*min/i.exec(durationLabel);
  return m ? Number.parseInt(m[1]!, 10) : DEFAULT_DURATION_MIN;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const dayISO = url.searchParams.get("date");
  const serviceId = url.searchParams.get("serviceId");
  if (!dayISO || !serviceId) {
    return Response.json({ error: "missing_params" }, { status: 400 });
  }

  const service = STUDIO_DATA.services.find((s) => s.id === serviceId);
  const durationMin = parseDurationMin(service?.duration);
  const tz = bookingTimeZone();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const cacheKey = `${calendarId}:${dayISO}:${durationMin}`;
  const cached = slotCache.get(cacheKey);
  if (cached) {
    return Response.json({ source: "cache", slots: cached });
  }

  const token = await getActiveGoogleToken();
  if (!token) {
    const slots = computeAvailableSlots({
      workingHours: WEEKLY_DEFAULT_HOURS,
      busy: [],
      serviceDurationMin: durationMin,
      dayISO,
      timeZone: tz,
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
      busy,
      serviceDurationMin: durationMin,
      dayISO,
      timeZone: tz,
    });
    slotCache.set(cacheKey, slots);
    return Response.json({ source: "gcal", slots });
  } catch (err) {
    console.warn("[booking/slots] falling back to static:", err);
    const slots = computeAvailableSlots({
      workingHours: WEEKLY_DEFAULT_HOURS,
      busy: [],
      serviceDurationMin: durationMin,
      dayISO,
      timeZone: tz,
    });
    return Response.json({ source: "static-fallback", slots });
  }
}
