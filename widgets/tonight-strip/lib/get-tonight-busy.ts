import "server-only";
import {
  fetchBusyWindows,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import type { BusyWindow } from "@/shared/lib/google-calendar/types";
import {
  getActiveGoogleToken,
  updateLastRefresh,
} from "@/db/google-tokens";
import { listActiveBookingsFrom } from "@/db/bookings";

/**
 * Real busy windows for the tonight strip's today + tomorrow window so it
 * only advertises genuinely-open times. Combines DB bookings (covers the
 * gap between submit and GCal sync, and the case where GCal sync failed)
 * with Google Calendar free/busy.
 *
 * Best-effort throughout: a missing token, missing creds, or a GCal error
 * degrades to "DB-only busy" rather than throwing — the strip must never
 * break the home page.
 */
export async function getTonightBusyWindows(
  now: Date = new Date(),
): Promise<BusyWindow[]> {
  // Generous 2-day window from now covers today + tomorrow regardless of
  // the studio timezone offset. Slots outside the grid are ignored by the
  // slot computation, so over-fetching is harmless.
  const rangeStart = now;
  const rangeEnd = new Date(now.getTime() + 2 * 86_400_000);

  let dbBusy: BusyWindow[] = [];
  try {
    const dbBookings = (await listActiveBookingsFrom(rangeStart)).filter(
      (b) => b.scheduledFor <= rangeEnd,
    );
    dbBusy = dbBookings.map((b) => ({
      start: b.scheduledFor,
      end: new Date(b.scheduledFor.getTime() + b.durationMinutes * 60_000),
    }));
  } catch (err) {
    console.warn("[tonight-strip] DB busy lookup failed:", err);
  }

  const token = await getActiveGoogleToken();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!token || !clientId || !clientSecret) return dbBusy;

  try {
    const { accessToken } = await refreshAccessToken({
      clientId,
      clientSecret,
      refreshToken: token.refreshToken,
    });
    await updateLastRefresh(token.userId);
    const gcalBusy = await fetchBusyWindows({
      calendarId: token.calendarId,
      rangeStart,
      rangeEnd,
      accessToken,
    });
    return [...dbBusy, ...gcalBusy];
  } catch (err) {
    console.warn("[tonight-strip] GCal busy lookup failed:", err);
    return dbBusy;
  }
}
