# Booking status visibility + Google Calendar confirm sync

**Date:** 2026-05-29
**Branch:** `feat/booking-status-visibility` (off `develop`, PR → `develop`)

## Problem

The customer profile shows upcoming visits and history but never communicates a
booking's **status**. A booking sits as `pending` until an admin confirms it, yet
the customer sees the same card whether it's awaiting approval, confirmed, or
cancelled. Cancelled bookings are hidden entirely. Customers have no way to
understand "is my appointment actually booked?".

Separately, the studio admin confirms bookings in the in-app admin panel today,
but also works directly in Google Calendar. When the admin marks a booking's
Calendar event as confirmed, the app does not reflect that — the DB row stays
`pending`.

## Goals

1. Surface all four booking statuses to the customer (`pending`, `confirmed`,
   `cancelled`, `completed`) with a clear, on-brand badge.
2. Add a daily safety-net that syncs a Google Calendar confirmation
   (event `tentative` → `confirmed`) back into the booking row.

## Non-goals

- Real-time (webhook / watch-channel) Calendar sync. Daily latency is acceptable.
- Reworking the admin booking panel beyond keeping it consistent.
- Two-way sync of cancellations from Calendar (out of scope this round).

## Existing state (verified)

- `booking_status` pgEnum: `pending | confirmed | cancelled | completed`
  ([db/schema.ts](../../../db/schema.ts)). `bookings.gcalEventId` is populated at
  submit-time.
- The GCal event is created in [views/booking/api/submit.ts](../../../views/booking/api/submit.ts)
  at booking time with `description: "Status: pending"` but **no explicit event
  `status`**, so Google defaults it to `confirmed`.
- [shared/lib/google-calendar/events.ts](../../../shared/lib/google-calendar/events.ts)
  exposes only `createCalendarEvent` + `deleteCalendarEvent` — there is no read
  helper.
- [db/bookings.ts](../../../db/bookings.ts) `listUserBookings` excludes cancelled
  (`ne(status, "cancelled")`); [entities/booking/lib/bucket-bookings.ts](../../../entities/booking/lib/bucket-bookings.ts)
  also drops cancelled.
- Profile namespace already has unused `pending_eyebrow` / `cancelled_eyebrow`
  strings (leftovers from an abandoned branch).
- One daily cron exists: `/api/cron/booking-reminders` at `08:00`
  ([vercel.json](../../../vercel.json)), CRON_SECRET-authed.
- Admin actions ([features/bookings-admin/api/actions.ts](../../../features/bookings-admin/api/actions.ts)):
  `confirmBooking` flips DB → confirmed; `declineBooking` → cancelled + deletes
  the GCal event.

## Design

### Unit A — `BookingStatusBadge` (shared/ui)

New presentational component `shared/ui/booking-status-badge`, following the
`new-ui-component` skill (Tailwind, Storybook story, Vitest test, public
`index.ts`).

- Props: `{ status: "pending" | "confirmed" | "cancelled" | "completed" }`.
- Renders a **dark, opaque pill** (per the glass-readability rule — no light
  tints on the dark/cream theme) with a colored hairline + label text:
  - `pending` → amber
  - `confirmed` → emerald/gold
  - `cancelled` → rose (muted)
  - `completed` → neutral/muted
- Label text comes from the `Profile.booking_status.*` i18n keys (en/ru/by).
- Accessible: the status word is real text (not color-only).

### Unit B — data layer changes

- **`entities/booking/lib/bucket-bookings.ts`**: include cancelled rows in
  `history` (newest first) alongside `completed`. Upcoming bucket unchanged
  (future `pending`/`confirmed`).
- **`db/bookings.ts` `listUserBookings`**: drop the `ne(status, "cancelled")`
  filter so cancelled rows reach the profile (this query is profile-only;
  slot/active logic uses separate queries, so this is safe).
- Status already rides on `UserBookingRow` (extends `schema.Booking`), so no new
  field plumbing is needed for rendering.

### Unit C — render the badge

- **[views/profile/ui/upcoming-bookings.tsx](../../../views/profile/ui/upcoming-bookings.tsx)**:
  badge on the hero next-visit card and on each "other upcoming" list row.
- **[views/profile/ui/booking-history.tsx](../../../views/profile/ui/booking-history.tsx)**:
  badge on each history row. Cancelled rows **keep** the "Book this again" CTA.

### Unit D — Google Calendar confirm sync (daily)

1. **Create events as tentative.** Add an optional
   `status?: "tentative" | "confirmed"` param to `createCalendarEvent`; pass
   `"tentative"` from `submit.ts` for new pending bookings.
2. **Read helper.** New `getCalendarEvent({ calendarId, eventId, accessToken })`
   in `events.ts` returning `{ status: string } | null` (404/410 → null),
   exported from the gcal `index.ts`.
3. **Query.** New `db/bookings.ts` `listPendingBookingsWithGcalEvent(cutoff)`:
   `status = 'pending' AND gcal_event_id IS NOT NULL AND scheduled_for > now()
   AND created_at >= cutoff`.
4. **Cron route.** New `/api/cron/booking-gcal-sync` (CRON_SECRET-authed, mirrors
   the reminders route). For each row, read the event; if its status is
   `confirmed`, call `setBookingStatus(id, "confirmed")` and dispatch the
   existing `booking_confirmed` push. Register a second daily entry in
   `vercel.json`.
5. **Symmetry.** `confirmBooking` (admin panel) also best-effort patches the GCal
   event `tentative` → `confirmed`, so the two paths agree. Failure is logged,
   not fatal (matches the existing best-effort GCal pattern).

### Migration safety (decided: gate by ship date)

Existing pending events were created without `status`, so Google treats them as
`confirmed` already — an ungated cron would auto-confirm them all on first run.
Mitigation: the `cutoff` passed to `listPendingBookingsWithGcalEvent` is the
feature ship date (a constant, e.g. `GCAL_SYNC_CUTOFF`), so the cron only acts on
bookings created after deploy. Pre-existing pending bookings continue to be
confirmed via the admin panel as today.

## Error handling

- All GCal calls stay best-effort (try/catch + `console.warn`), matching
  `submit.ts` / `declineBooking`. A Calendar outage never breaks the customer
  flow or the cron's other rows.
- Cron is idempotent: it only flips `pending` → `confirmed`, so re-runs are safe.
- DB-disabled (`db === null`) paths return empty/no-op as elsewhere.

## Testing

- `bucketBookings`: cancelled now lands in history, sorted newest-first.
- `BookingStatusBadge`: Storybook story (all four) + Vitest (renders correct
  label/variant per status).
- `getCalendarEvent`: mocked fetch — ok, 404→null, error throw.
- `listPendingBookingsWithGcalEvent`: respects cutoff + status + gcalEventId.
- Cron route: confirmed event flips status + dispatches; tentative leaves it;
  unauthorized → 401.
- i18n: `Profile.booking_status.*` present in en/ru/by.

## Out-of-scope follow-ups

- Webhook-based near-real-time sync.
- Syncing Calendar **cancellations** back to the DB.
