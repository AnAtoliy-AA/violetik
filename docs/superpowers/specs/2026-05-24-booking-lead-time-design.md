# Booking lead-time guard — design

**Date:** 2026-05-24
**Author:** brainstorming session

## Problem

The booking flow lets a user pick:

- **A date in the past.** The date strip in [views/booking/lib/booking-steps.ts](../../../views/booking/lib/booking-steps.ts) builds 14 days from a hard-coded `BOOKING_START_ISO = "2026-05-19"`. Today is 2026-05-24, so the first five cells are already past dates with no `disabled` flag.
- **A time too close to "now."** [/api/booking/slots](../../../app/api/booking/slots/route.ts) returns every slot inside the studio's working hours regardless of how close it is to the present. `submitBooking` ([views/booking/api/submit.ts](../../../views/booking/api/submit.ts)) has no lead-time guard either.

Both fail-modes need to be blocked. Without it, a user can submit a booking for "yesterday at 10:00" or "today, 30 minutes from now" — neither is a usable appointment.

## Goal

Reject any booking whose start time is in the past or within **3 hours** of the server's current time. Surface this in two places:

1. **Server** is the source of truth. The slots API filters out bad slots; `submitBooking` rejects them defensively in case the client bypasses the API.
2. **Client** mirrors the constraint so the UI doesn't show or accept slots the server will reject.

## Non-goals

- Configurable lead time per service / per studio. The 3-hour value is hard-coded as `MIN_BOOKING_LEAD_MINUTES`. It can be promoted to site settings later if admins want to tune it.
- Removing the Sun/Mon closed-day rule. Out of scope.
- Changing the booking flow's step order, GCal sync, or DB schema.

## Design

### Single constant

```ts
// views/booking/lib/booking-steps.ts
export const MIN_BOOKING_LEAD_MINUTES = 180;
```

Both client and server import this. No magic numbers.

### Server changes

**1. `shared/lib/google-calendar/slots.ts` — pure lead-time filter**

`SlotComputationInput` gains two optional fields:

```ts
interface SlotComputationInput {
  // ...existing...
  now?: Date;             // server "now"; if omitted, no lead-time filtering
  minLeadMinutes?: number;
}
```

After deriving raw slots, the function drops any whose UTC start time is `< now.getTime() + minLeadMinutes * 60_000`. Behaviour is unchanged when `now` is omitted, so existing call sites and unit tests are not broken.

**2. `app/api/booking/slots/route.ts` — wire it up**

Pass `now: new Date()` and `minLeadMinutes: MIN_BOOKING_LEAD_MINUTES` into every `computeAvailableSlots(...)` call (the three branches: gcal happy-path, no-token, gcal-error fallback). Stale slots disappear from the API response.

**3. `views/booking/api/submit.ts` — defensive cutoff**

After `scheduledFor` is built, before any DB write:

```ts
if (scheduledFor.getTime() - Date.now() < MIN_BOOKING_LEAD_MINUTES * 60_000) {
  return { ok: false, error: "too_soon" };
}
```

Add `"too_soon"` to the `SubmitBookingResult` error union. This guard catches:

- Race condition: user opened the time step at `13:55`, picked `17:00`, paused 70 minutes, submitted at `15:05` — the slot was valid when fetched, isn't valid now.
- Client tampering / replay.

### Client changes

**4. `views/booking/lib/booking-steps.ts` — dynamic start, past-day disable**

Replace the `BOOKING_START_ISO` constant with a helper:

```ts
export function bookingStartISO(now: Date, timeZone: string): string;
// returns "YYYY-MM-DD" of `now`'s civil date in `timeZone`
```

`buildDateStrip` takes a new shape:

```ts
export function buildDateStrip(
  locale: string,
  timeZone: string,
  now?: Date, // defaults to new Date() — injectable for tests
): DateCell[];
```

The Sun/Mon rule stays. No new "past" rule is needed at this layer because the strip starts at today by construction — past days are simply not generated.

Note: the existing implementation advances days with `setUTCDate`. The new helper must advance in `timeZone`, not UTC. If the studio is in `Europe/Minsk` (UTC+3) and the request hits at 23:30 local on a Saturday, UTC has rolled to Sunday but the studio's civil "today" is still Saturday — the strip must start at Saturday. Implementation: compute the civil date in `timeZone` via `Intl.DateTimeFormat`, then iterate by adding ISO days (`day + i`) and re-formatting, not by mutating a UTC `Date`.

**5. `views/booking/ui/steps/date-step.tsx` — receive timezone prop**

The booking view's server entry (the page that mounts the stepper) already fetches `getSiteSettingsServer()` for other reasons; thread `bookingTimeZoneFromSettings(settings)` down to `DateStep` as a prop. Don't try to derive timezone client-side from `Intl.DateTimeFormat().resolvedOptions().timeZone` — that's the visitor's timezone, not the studio's.

Note: this component also calls `formatMonthYear(BOOKING_START_ISO, locale)` (current line 24). When the constant is removed, this call must use a `now`-derived ISO too — easiest is `formatMonthYear(bookingStartISO(now, tz), locale)`.

**6. `views/booking/ui/steps/time-step.tsx` — empty-state**

When `slots.length === 0` (today's remaining time is all inside the 3-hour cutoff, or it's a closed day picked via deep link), render a translated empty-state in the same place the slot grid would render. New translation key under `Booking.time`, e.g. `none_available`.

**7. Confirm step error UI**

Map the new `too_soon` server error to a translated message in `Booking.confirm` (or wherever existing errors like `slot_taken` are shown). One new key.

### Translation keys

New keys per locale (`en`, `ru`, `be`):

- `Booking.time.none_available` — "No times available for this date. Please pick another day."
- `Booking.errors.too_soon` — "This time is too close to now. Bookings need at least 3 hours' notice. Please pick another time."

(`Booking.errors` is the existing namespace where `slot_taken`, `db_unavailable`, etc. live — consumed by [views/booking/ui/booking-page.tsx](../../../views/booking/ui/booking-page.tsx) via `useTranslations("Booking.errors")`. Add `too_soon` to that namespace rather than introducing a new `Booking.confirm.error_*` family.)

The exact copy can be polished during implementation.

## Testing

### Unit (Vitest)

- **`views/booking/lib/booking-steps.test.ts`**
  - The existing assertion `expect(days[0].iso).toBe("2026-05-19")` is rewritten to inject `now = new Date("2026-05-19T08:00:00Z")` and `timeZone = "Europe/Minsk"`, then assert `days[0].iso === bookingStartISO(now, tz)`.
  - Sun/Mon still disabled.
  - Length still 14.
  - Add: when `now`'s civil date is a Monday, `days[0].disabled === true`.

- **`shared/lib/google-calendar/slots.test.ts`**
  - New test: `now = new Date("2026-05-19T11:00:00+03:00")`, `minLeadMinutes = 180`, working window `10:00–19:00 Europe/Minsk`, service 60 min → slots `< 14:00` are dropped, `14:00`+ are present.
  - Existing tests pass unchanged (they don't pass `now`).

- **`submitBooking` cutoff** — extract a pure helper:
  ```ts
  // views/booking/lib/lead-time.ts
  export function isTooSoon(scheduledFor: Date, now: Date, minLeadMinutes: number): boolean;
  ```
  Test the helper directly with synthetic dates. `submitBooking` calls it and returns `too_soon` when true. This keeps the server action testable without mocking the whole DB.

### Manual

- Open `/booking`, walk through service → master → date. First cell of the strip should be today (or the next open weekday).
- For today's date, observe that the time grid omits any slot earlier than `now + 3h`. Confirm by checking the network response for `/api/booking/slots`.
- For a future date, observe full slot list (modulo Google Calendar busy windows).
- For a closed day or "today, all slots cut off," observe the empty-state copy.

## Edge cases

- **DST**: `computeAvailableSlots` already uses `Intl.DateTimeFormat("longOffset")` for tz arithmetic; the new `now + leadMs` comparison is done in UTC ms, so it's DST-safe.
- **Clock skew between client and server**: server's `Date.now()` is canonical. The client may briefly render a slot that's just past the cutoff; the submit-time guard catches it.
- **Visitor in a different timezone from the studio**: the date strip uses the studio timezone (passed as a prop). The visitor sees a strip aligned to the studio's calendar day, which is correct.
- **`BOOKING_START_ISO` removal**: any test or storybook fixture that imported the constant must inject a `now` instead. Grep shows two usages — `date-step.tsx` and the lib's own test — both updated by this design.

## Risk

Low. All changes are additive (server filters are gated on a new optional input; the helper extraction in `booking-steps.ts` keeps the existing call shape via the `now?` default). The only breaking surface is the unit test that hard-coded `"2026-05-19"` — that's expected to be rewritten.

## What stays the same

- `BOOKING_TIMES` static fallback used by Storybook before the API replies.
- Sun/Mon closed-day rule.
- All GCal sync logic.
- DB unique-index slot protection (`bookings_scheduled_for_active_uniq`).
- Step order, navigation, submit flow.
