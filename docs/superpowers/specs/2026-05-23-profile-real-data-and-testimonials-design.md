# Customer Profile — Real Bookings, Self-Cancel, Testimonials

**Date:** 2026-05-23
**Status:** Approved (autonomous build — user instructed "select recommended until PR open")
**Branch:** `feature/profile-real-data-and-testimonials` (off `develop`, PR targets `develop`)

## 1. Goal

Replace the hard-coded mock on `/[locale]/profile` ([views/profile/ui/profile-page.tsx](../../../views/profile/ui/profile-page.tsx)) with a real, signed-in customer surface that:

1. Reads the user's bookings from the `bookings` table (upcoming + history) joined to `masters`. Services are resolved against `listAllServices()` (the view already does this for the mocked rows; we keep the same indirection).
2. Shows the user's real "joined" year from `users.created_at` (already in [db/schema.ts:42](../../../db/schema.ts#L42)).
3. Lets the user **cancel any upcoming booking** when `scheduledFor − now > 24h`.
4. When cancel is blocked (≤ 24h to visit), shows a **"Contact <Master> on Telegram"** deep-link (with a studio-wide fallback if that master has no Telegram username configured).
5. Lets the user submit a **public testimonial** about any published master (free-form body, no rating). New testimonials start `status='pending'` and are visible only to the author until admin moderation approves them.
6. Shows the user their own submitted testimonials with status (Pending / Published / Not published).

## 2. Non-goals

- **Admin testimonial moderation UI** and **public testimonial rendering on master pages** — separate spec. This PR lands the data and the customer-side submit/list surface only.
- **Booking reschedule / edit** from the profile — separate spec. Cancel is the only mutation.
- **Notifying the master on cancel** — the customer using the "Contact master" link is the only manual touchpoint.
- **Rating / star score** — body text only.
- **Editing or deleting a submitted testimonial** — once submitted, the customer cannot edit; if rejected by admin, they can submit a new one.
- **Volumetric rate-limiting on testimonial submission** beyond the one-pending-per-`(user, master)` partial unique index.
- **End-to-end sign-in fixture** for Playwright. Today's CI runs without `TELEGRAM_BOT_TOKEN`, so the route is exercised as anonymous. This PR keeps that posture (see §9.3); a real signed-in e2e fixture is a follow-up.

## 3. Cancellation policy

`canSelfCancel(now: Date, scheduledFor: Date): boolean` returns `true` **iff** `scheduledFor − now > 24h` (strict; the boundary is closed on the "must contact master" side — exactly 24h ⇒ false). Past times are always `false`.

Cancel is **also** blocked if the booking's `status` is already `cancelled` or `completed`. That second check is a **server-side race guard** — the UI only ever renders the cancel button on rows whose status is `pending` or `confirmed`, so the "already cancelled" path is reached only via a stale form submission (e.g. two tabs). It returns a recognizable response code (§6.1) but produces no extra UI section; cancelled rows are not rendered anywhere on the page.

## 4. Storage changes

### 4.1 `masters.telegram_username` (nullable)

```sql
ALTER TABLE masters ADD COLUMN telegram_username text;
```

- Nullable. When NULL, the contact CTA falls back to the studio-wide username (see 4.2).
- Stored without the leading `@`. The UI prepends `https://t.me/` and trims a leading `@` defensively if the admin pasted one.
- App-level validation (Zod, in [features/masters-admin](../../../features/masters-admin)'s edit action): matches `/^[A-Za-z][A-Za-z0-9_]{4,31}$/` per Telegram's username rules; rejected on save with an admin-facing error.

### 4.2 `site_settings.telegram_username` (nullable)

```sql
ALTER TABLE site_settings ADD COLUMN telegram_username text;
```

Same validation rule as masters. Set via `/admin/studio` (existing route — adding one field to its form in [features/studio-admin](../../../features/studio-admin)). When both per-master and site-wide are NULL, the contact CTA is replaced with a static "Please contact the studio." line so the user is never shown a dead link.

### 4.3 `testimonials`

```sql
CREATE TYPE testimonial_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE testimonials (
  id          text PRIMARY KEY,                -- "tst_" + 16 hex
  user_id     text NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  master_id   text NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  body        text NOT NULL,
  status      testimonial_status NOT NULL DEFAULT 'pending',
  decided_at  timestamptz,
  decided_by  text REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX testimonials_user_idx    ON testimonials(user_id);
CREATE INDEX testimonials_master_idx  ON testimonials(master_id);
CREATE INDEX testimonials_status_idx  ON testimonials(status);

-- One outstanding pending submission per (user, master) — partial unique:
CREATE UNIQUE INDEX testimonials_one_pending_per_pair
  ON testimonials(user_id, master_id)
  WHERE status = 'pending';
```

**Id generation** mirrors [db/bookings.ts:24](../../../db/bookings.ts#L24) and [db/vip-requests.ts:6](../../../db/vip-requests.ts#L6):

```ts
function generateTestimonialId(): string {
  return `tst_${randomBytes(8).toString("hex")}`;
}
```

The id is produced inside `createTestimonial()` in `db/testimonials.ts`; no `$defaultFn` on the schema column (the project never uses Drizzle defaults for ids — explicit helper everywhere). This matches the convention used by bookings and vip-requests.

App-level invariants:

- `body` is required, trimmed, length **1..800** chars after trim. The `text` column intentionally has no DB length cap so future moderation can quote it verbatim.
- Master must be published (`masters.status = 'published'`) — checked in the action via `getMasterById()` ([db/masters.ts:49](../../../db/masters.ts#L49)) before insert. No DB constraint or FK trick; pure service-layer guard, so deleting/un-publishing a master later doesn't invalidate existing rows.
- Submitting a second pending testimonial for the same `(user, master)` is rejected with `reason: 'duplicate_pending'`. Approved or rejected past rows do not block.

## 5. Module layout (FSD)

```
db/
  schema.ts                           # +masters.telegramUsername
                                      # +siteSettings.telegramUsername
                                      # +testimonials table & testimonialStatus enum
  bookings.ts                         # +listUserBookings(userId)
  testimonials.ts                     # new: createTestimonial, listUserTestimonials
  testimonials.test.ts                # new
  migrations/NNNN_profile_*.sql       # generated by drizzle-kit

entities/booking/                     # new, thin
  index.ts
  lib/can-self-cancel.ts              # pure (now, scheduledFor) => boolean
  lib/can-self-cancel.test.ts
  lib/bucket-bookings.ts              # (rows, now) => { upcoming[], history[] }
  lib/bucket-bookings.test.ts
  model/types.ts                      # UserBookingRow (booking + master fields)

entities/master/                      # existing; surface telegramUsername type-side
  model/types.ts                      # +telegramUsername: string | null

features/booking-cancel/              # new slice
  index.ts
  api/cancel-booking-action.ts        # 'use server'
  api/cancel-booking-action.test.ts
  ui/cancel-booking-button.tsx        # client; useTransition; optimistic disable
  ui/cancel-booking-button.test.tsx
  ui/cancel-booking-button.stories.tsx
  ui/contact-master-link.tsx          # presentation; takes telegramUsername | null
  ui/contact-master-link.test.tsx
  ui/contact-master-link.stories.tsx

features/testimonial-submit/          # new slice
  index.ts
  api/submit-testimonial-action.ts    # 'use server'
  api/submit-testimonial-action.test.ts
  ui/testimonial-form.tsx             # client; master select + textarea
  ui/testimonial-form.test.tsx
  ui/testimonial-form.stories.tsx
  ui/my-testimonials-list.tsx         # server component
  ui/my-testimonials-list.test.tsx

features/masters-admin/               # existing; extend with telegram_username field
  ui/master-form.tsx                  # +input + Zod
  ui/master-form.test.tsx             # +case

features/studio-admin/                # existing; one new field
  ui/studio-form.tsx                  # +input + Zod
  ui/studio-form.test.tsx             # +case

views/profile/
  ui/profile-page.tsx                 # rewired: real data + new sections
  ui/profile-page.test.tsx            # updated

messages/{en,ru,be}.json              # new Profile.* keys
```

No deep cross-slice imports. Each feature exposes its public API via `index.ts`; the view composes them.

## 6. Server-action contracts

Both actions follow the existing house convention from [features/services-admin/api/*.ts](../../../features/services-admin/api/): use `revalidatePath("/", "layout")` to invalidate the whole locale tree (next-intl's path-prefix routing means a single root-layout revalidation refreshes every locale at once; the per-locale tree walks fall out for free).

### 6.1 `cancelBookingAction`

```ts
async function cancelBookingAction(bookingId: string): Promise<
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'unauthenticated'
        | 'not_found'
        | 'not_owner'
        | 'too_late'           // ≤ 24h gate
        | 'already_cancelled'  // includes status='completed'; server-side race guard
        | 'unknown';
    }
>;
```

Behavior:

1. `getCurrentSessionUser()` → if null, return `{ ok:false, reason:'unauthenticated' }`.
2. `getBookingById(bookingId)` → if `null`, `not_found`.
3. If `booking.userId !== session.user.id`, `not_owner`.
4. If `booking.status === 'cancelled' || booking.status === 'completed'`, `already_cancelled`.
5. If `canSelfCancel(new Date(), booking.scheduledFor) === false`, `too_late`.
6. `setBookingStatus(bookingId, 'cancelled')` ([db/bookings.ts:119](../../../db/bookings.ts#L119)).
7. **Best-effort GCal cleanup:** if `gcalEventId` present, mirror the existing admin-side flow in [features/bookings-admin/api/actions.ts:32](../../../features/bookings-admin/api/actions.ts#L32) (`declineBooking`) — `getActiveGoogleToken()` → `refreshAccessToken(...)` → `deleteCalendarEvent({ calendarId, eventId, accessToken })`. Wrap in try/catch with a `console.warn` matching the admin path's message style. Failures do not flip the response to a failure; the cancellation is recorded in the DB regardless.
8. `revalidatePath("/", "layout")`.

**Race safety:** the DB update at step 6 is wrapped in a status-conditional UPDATE inside `setBookingStatus` (added on top of the existing helper) — `UPDATE … WHERE id = $1 AND status NOT IN ('cancelled','completed') RETURNING *`. If `RETURNING` is empty, the action returns `already_cancelled`. Two concurrent submits are therefore idempotent: one wins, the loser gets `already_cancelled`.

### 6.2 `submitTestimonialAction`

```ts
async function submitTestimonialAction(input: {
  masterId: string;
  body: string;
}): Promise<
  | { ok: true; id: string }
  | {
      ok: false;
      reason:
        | 'unauthenticated'
        | 'invalid_master'      // not found OR status != 'published'
        | 'body_required'       // trim-empty
        | 'body_too_long'       // > 800 chars after trim
        | 'duplicate_pending'   // partial unique index violation
        | 'unknown';
    }
>;
```

Validation order:

1. `getCurrentSessionUser()` → if null, `unauthenticated`.
2. Zod shape: `masterId: non-empty string`, `body: string`. Trim `body`. If empty → `body_required`. If trimmed length > 800 → `body_too_long`.
3. `getMasterById(input.masterId)` → if null or `master.status !== 'published'` → `invalid_master`. This is the **single source of truth** for "published master"; the form's `<select>` is populated by `listPublishedMasters()` so the two paths can't disagree.
4. `createTestimonial({ userId, masterId, body })` inside `db/testimonials.ts`. On unique-constraint violation (Postgres SQLSTATE `23505`) → `duplicate_pending`.
5. `revalidatePath("/", "layout")` → `{ ok: true, id }`.

## 7. UX outline

```
Profile (signed-in)
├─ Hero (existing): avatar, name, VIP/Pending-VIP badge, "Joined 2024"
│   └─ "Joined" year ← users.createdAt.getUTCFullYear()
│      Rationale: locale-agnostic, no DST jitter; mock today shows just "2024".
├─ Upcoming visits
│   ├─ Spotlight card (closest visit — keeps today's SpotlightCard treatment)
│   │    ├─ Service name + master name + date · time
│   │    └─ Action region:
│   │          if canSelfCancel  → [Cancel visit] button
│   │          else              → "Contact <Master> on Telegram →" link
│   │                             (or studio fallback, or static text)
│   └─ Compact list (other upcoming) — same action logic per row, smaller card
├─ Quick links (existing, unchanged)
├─ History
│   ├─ status='completed' rows only (latest first, capped at 20 rows in v1 —
│   │   no "load more"; cap is generous given the studio's volume)
│   └─ Empty state: muted "No past visits yet." line
├─ Testimonials
│   ├─ <TestimonialForm>:
│   │     master <select> populated by listPublishedMasters()
│   │     <textarea> with live character counter (800 max)
│   │     [Submit]
│   ├─ <MyTestimonialsList>:
│   │     Each row: master name · date · status pill · body (collapsed to 2 lines)
│   │     Status pill copy:
│   │        pending  → "Pending review"
│   │        approved → "Published"
│   │        rejected → "Not published"
│   └─ Empty state: prompt copy ("Share a few words about a master…")
└─ TabBar (existing)

Profile (anonymous)
└─ Redirect to /[locale]/sign-in?callbackUrl=/[locale]/profile
    (Implemented in views/profile/ui/profile-page.tsx — server component
    can call redirect() from "next/navigation".)
```

Zero-bookings state: upcoming + history sections collapse into one muted "No visits yet." line; the testimonials section still renders.

## 8. Reads — `listUserBookings`

```ts
export interface UserBookingRow extends schema.Booking {
  masterNameEn: string | null;
  masterNameRu: string | null;
  masterNameBe: string | null;
  masterTelegramUsername: string | null;
  // Service display name is resolved against listAllServices() in the view,
  // mirroring how profile-page.tsx already does it today — no service join here.
}

export async function listUserBookings(userId: string): Promise<UserBookingRow[]>;
```

- `LEFT JOIN masters ON bookings.master_id = masters.id` (master is optional on a booking row).
- Returns all rows for the user, ordered by `scheduled_for ASC`. Bucketing into upcoming/history happens in `bucketBookings()` using a single `now` captured server-side.
- Cancelled rows are excluded at the query level (`WHERE status != 'cancelled'`). They are never surfaced in v1 — neither in upcoming, nor history, nor anywhere else. The server-side race guard in §6.1 is the only path that touches a cancelled row, and only to return an error code.

## 9. Testing

### 9.1 Vitest (unit + integration)

| File | Asserts |
|---|---|
| `entities/booking/lib/can-self-cancel.test.ts` | strict `> 24h` boundary (24h ± 1 min); past dates → false; `now === scheduledFor` → false |
| `entities/booking/lib/bucket-bookings.test.ts` | upcoming = future `pending`/`confirmed`; history = past `completed`; cancelled rows excluded everywhere |
| `db/bookings.test.ts` (extend existing) | `listUserBookings(userId)` returns only that user's rows; master join populates `masterTelegramUsername`; cancelled rows excluded |
| `db/testimonials.test.ts` (new) | `createTestimonial` inserts pending; partial-unique blocks second pending for same `(user, master)`; rejected/approved past rows do not block; `listUserTestimonials(userId)` returns only their rows newest-first |
| `features/booking-cancel/api/cancel-booking-action.test.ts` | unauthenticated → `unauthenticated`; not-owner → `not_owner`; status conditional-update → `already_cancelled` is idempotent under concurrent submit; `too_late` exactly at 24h; happy path returns `ok:true` and flips status |
| `features/testimonial-submit/api/submit-testimonial-action.test.ts` | trim-empty → `body_required`; >800 → `body_too_long`; unpublished master → `invalid_master`; archived master → `invalid_master`; second pending → `duplicate_pending`; happy path returns `ok:true` |
| `views/profile/ui/profile-page.test.tsx` | renders real data (mock the db helpers); shows cancel button vs telegram link based on a fake `Date.now()`; empty states render; anonymous → redirect-thrown |

All new component tests follow [shared/ui/button/](../../../shared/ui/button) as the reference style (vitest + RTL).

### 9.2 Storybook

- `CancelBookingButton` — idle / pending / disabled-with-contact-fallback variants
- `ContactMasterLink` — has-username / no-username (studio fallback) / no-fallback (static text)
- `TestimonialForm` — idle / submitting / success-toast / each error variant
- `MyTestimonialsList` — empty / mixed-status / single-row

All stories live next to their component (`*.stories.tsx`) and are picked up by [.storybook/main.ts](../../../.storybook/main.ts).

### 9.3 Playwright e2e — `e2e/profile.spec.ts` (replaces existing file)

The existing [e2e/profile.spec.ts](../../../e2e/profile.spec.ts) asserts mock copy (`"Lara K."`, `"Couture Gel"`, `"In 4 days"`) that will not survive the rewire. CI runs without `TELEGRAM_BOT_TOKEN` (see [e2e/sign-in.spec.ts](../../../e2e/sign-in.spec.ts) header), so there is no real sign-in in CI. v1 e2e scope:

1. **Anonymous → /profile redirects to /sign-in.** Visit `/en/profile`; assert URL ends with `/en/sign-in` and `callbackUrl=/en/profile`. Repeat for `/be/profile` to verify locale survives.
2. **Sign-in page still renders** — keep the existing assertion to make sure we haven't broken auth surface.

Authenticated-flow e2e (the original spec's cancel-button / Telegram-link / testimonial-submit assertions) is deferred until a sign-in test fixture exists. Unit + RTL component tests already cover the same logic at finer granularity, so the e2e gap is acceptable for v1.

## 10. i18n keys (new)

New keys under `Profile.*` in [messages/en.json](../../../messages/en.json), [messages/ru.json](../../../messages/ru.json), [messages/be.json](../../../messages/be.json):

```
Profile.upcoming_eyebrow            "Upcoming"
Profile.upcoming_empty              "No upcoming visits."
Profile.cancel_button               "Cancel visit"
Profile.cancel_confirming           "Cancelling…"
Profile.cancel_error                "Could not cancel — try again or contact the master."
Profile.contact_master_cta          "Contact {name} on Telegram"
Profile.contact_studio_cta          "Contact the studio on Telegram"
Profile.contact_offline_cta         "Please contact the studio."
Profile.with_master                 "with {name}"
Profile.history_empty               "No past visits yet."
Profile.testimonials_eyebrow        "Testimonials"
Profile.testimonials_empty          "Share a few words about a master."
Profile.testimonial_form_master     "Master"
Profile.testimonial_form_body       "Your testimonial"
Profile.testimonial_form_submit     "Submit"
Profile.testimonial_form_submitting "Submitting…"
Profile.testimonial_form_success    "Thank you — your testimonial is pending review."
Profile.testimonial_form_too_long   "Please keep it under 800 characters."
Profile.testimonial_form_required   "Please write a few words."
Profile.testimonial_form_duplicate  "You already have a testimonial pending for this master."
Profile.testimonial_form_invalid_master "Please pick a master."
Profile.status_pending              "Pending review"
Profile.status_approved             "Published"
Profile.status_rejected             "Not published"
```

Translations: EN authoritative; RU/BE follow existing in-file tone (informal "ты"-equivalent in BE, polite in RU as the rest of the file does).

## 11. Migration & rollout

1. `npm run db:generate` → produces `db/migrations/NNNN_*.sql` containing the three structural changes (two ALTERs, one CREATE TABLE + indices + enum). `npm run db:migrate` applies it.
2. Backfill is unnecessary — both new columns are nullable; the testimonials table starts empty.
3. After migration, the admin manually populates `masters.telegram_username` for each published master via `/admin/masters` (existing form gets one new field — included in this PR).
4. The `/admin/studio` form gets one new field for the studio-wide fallback (included in this PR).

## 12. Prerequisites

Branched from `develop` at `88c1c03` (Merge PR #50 admin-studio-location). All foundational code referenced in this spec is present on that commit: `auth.ts`, `db/schema.ts` with `users`/`bookings`/`masters`/`services`/`site_settings`, `shared/lib/auth-server.ts` (`getCurrentSessionUser`), `entities/master`, `features/masters-admin` and `features/studio-admin` (the two admin forms we'll extend), [shared/ui/spotlight-card](../../../shared/ui/spotlight-card), and the existing `e2e/profile.spec.ts` whose anonymous-redirect rewrite is described in §9.3.

PR targets `develop`.

## 13. Out of scope (called out so the PR doesn't grow)

- Admin moderation surface for testimonials.
- Public rendering of approved testimonials on master pages.
- Booking reschedule.
- Master-side notification on customer cancel.
- Volumetric rate-limiting on testimonial submission.
- Authenticated-flow Playwright e2e (deferred until a sign-in test fixture exists; covered at unit+RTL level for v1).

A follow-up spec will cover the moderation + public-rendering surface and link back to this one.
