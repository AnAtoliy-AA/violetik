"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  bookingTimeZone,
  createCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import {
  getActiveGoogleToken,
  updateLastRefresh,
} from "@/db/google-tokens";
import {
  createBooking,
  setBookingGcalEventId,
} from "@/db/bookings";
import { ensureUserRow } from "@/db/ensure-user";
import { STUDIO_DATA } from "@/entities/studio";

const DEFAULT_DURATION_MIN = 60;

function parseDurationMin(label?: string): number {
  if (!label) return DEFAULT_DURATION_MIN;
  const m = /^(\d+)\s*min/i.exec(label);
  return m ? Number.parseInt(m[1]!, 10) : DEFAULT_DURATION_MIN;
}

/**
 * Convert local "YYYY-MM-DD" + "HH:MM" in `timeZone` to a UTC `Date`.
 * Mirror of the helper inside slots.ts — kept inline so the server
 * action doesn't pull the whole slot-computation module.
 */
function localToUtc(dayISO: string, hm: string, timeZone: string): Date {
  const [h, m] = hm.split(":").map((x) => Number.parseInt(x, 10));
  const naive = new Date(
    `${dayISO}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`,
  );
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(naive);
  const tzPart =
    parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(tzPart);
  const offsetMs = match
    ? (match[1] === "+" ? 1 : -1) *
      (Number.parseInt(match[2]!, 10) * 60 +
        Number.parseInt(match[3]!, 10)) *
      60_000
    : 0;
  return new Date(naive.getTime() - offsetMs);
}

export interface SubmitBookingInput {
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  locale: string;
}

export type SubmitBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "slot_taken" | "db_unavailable" | "invalid_input" | "unknown" };

/**
 * Server-side booking submission. Validates session + input, inserts a
 * pending booking row, then writes a GCal event to block the slot.
 *
 * GCal write is best-effort: if it fails (token revoked, scope too
 * narrow, network blip), the DB row stays pending with gcal_event_id
 * NULL — admin sees the row and can sync manually. The unique index
 * on bookings.scheduled_for keeps the slot blocked regardless.
 */
export async function submitBooking(
  input: SubmitBookingInput,
): Promise<SubmitBookingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/${input.locale}/sign-in?callbackUrl=${encodeURIComponent(`/${input.locale}/booking/confirm`)}`,
    );
  }

  const service = STUDIO_DATA.services.find((s) => s.id === input.serviceId);
  if (!service || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    return { ok: false, error: "invalid_input" };
  }

  const tz = bookingTimeZone();
  const scheduledFor = localToUtc(input.date, input.time, tz);
  const durationMin = parseDurationMin(service.duration);

  // Safety net: the Auth.js signIn callback is supposed to upsert
  // the user row, but it swallows errors. Re-assert here so the
  // foreign key on bookings.user_id always has something to reference.
  try {
    await ensureUserRow(session);
  } catch (err) {
    console.error(
      "[submitBooking] ensureUserRow failed for userId=%s: %o",
      session.user.id,
      err,
    );
    return { ok: false, error: "db_unavailable" };
  }

  let booking;
  try {
    booking = await createBooking({
      userId: session.user.id,
      serviceId: input.serviceId,
      scheduledFor,
      durationMinutes: durationMin,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("bookings_scheduled_for_active_uniq")) {
      return { ok: false, error: "slot_taken" };
    }
    console.error(
      "[submitBooking] createBooking failed for userId=%s serviceId=%s scheduledFor=%s: %o",
      session.user.id,
      input.serviceId,
      scheduledFor.toISOString(),
      err,
    );
    return { ok: false, error: "unknown" };
  }

  if (!booking) {
    return { ok: false, error: "db_unavailable" };
  }

  // Best-effort GCal write. Wrapped so a calendar error doesn't fail
  // the user-facing booking — the row exists and the unique index
  // already protects the slot.
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
      const end = new Date(scheduledFor.getTime() + durationMin * 60_000);
      const customerLabel = session.user.name ?? session.user.id;
      const eventId = await createCalendarEvent({
        calendarId: token.calendarId,
        accessToken,
        summary: `${service.name} · ${customerLabel}`,
        description: `Violetta booking ${booking.id}\nStatus: pending`,
        start: scheduledFor,
        end,
        timeZone: tz,
      });
      await setBookingGcalEventId(booking.id, eventId);
      await updateLastRefresh(token.userId);
    }
  } catch (err) {
    console.warn(
      "[submitBooking] GCal sync failed; booking persisted without event:",
      err,
    );
  }

  redirect(`/${input.locale}/booking/confirmation?id=${booking.id}`);
}
