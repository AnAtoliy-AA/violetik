# Google Calendar Integration — Design Spec

**Date:** 2026-05-20
**Status:** Approved (user pre-approved via "select recommended until PR open")
**Owner:** Violetta Beauty (violetik)
**Predecessors:** PR 21 (Telegram auth), PR 22 (DB schema), PR 23 (dev-origins)

## 1. Goal

Let the studio admin (Violetta) connect her Google Calendar once, then have the
public booking flow read free/busy windows from that calendar to compute real
available slots — replacing the current hardcoded `BOOKING_TIMES` array.

**In scope (PR 3):** OAuth connect/disconnect, token storage, free/busy reader,
slot derivation, booking-page wiring, admin status UI.

**Out of scope (later PRs):**

- Writing booking events back to Google Calendar (PR 4)
- Admin editor for weekly working hours (PR 4 — PR 3 uses hardcoded
  Tue–Sat 10:00–19:00 fallback)
- Instagram OAuth (PR 6, blocked by Meta app review)
- Email notifications on booking (PR 5)

## 2. Decisions locked in

| Question | Decision | Rationale |
|---|---|---|
| OAuth shape | Separate flow at `/admin/integrations/google` | Keeps Auth.js focused on Telegram identity; integration tokens are a different concern |
| Token storage | New `google_oauth_tokens` table, plaintext refresh token | Supabase TLS + RLS is enough for v1; app-level encryption is YAGNI |
| Slot granularity | 30 min | Standard salon convention; lets services with mixed durations land cleanly |
| Working hours source | Hardcoded `WEEKLY_DEFAULT_HOURS` constant, Tue–Sat 10:00–19:00 | `availabilityRules` table exists but is empty; editor lands in PR 4 |
| Calendar ID | `"primary"` of connected account (env-overridable via `GOOGLE_CALENDAR_ID`) | Single-calendar studios are the norm; multi-calendar support is YAGNI |
| Timezone | `Europe/Minsk` via `NEXT_PUBLIC_BOOKING_TIMEZONE` (default) | Salon-local time so the slot grid matches what Violetta and customers see |
| Caching | 60s in-memory LRU per Vercel instance | Cheap, no Redis dependency; rebuilds on cold start |
| Fallback when disconnected | Existing static `BOOKING_TIMES` minus `RESERVED_TIMES` | Booking stays functional during incidents and in staging |

## 3. Architecture

### 3.1 Module layout (FSD)

```
shared/
  lib/google-calendar/
    oauth.ts          ← buildAuthUrl, exchangeCode, refreshAccessToken
    free-busy.ts      ← fetchBusyWindows(calendarId, range, accessToken)
    slots.ts          ← computeAvailableSlots(workingHours, busy, service, tz)
    types.ts
    index.ts

db/
  schema.ts           ← + googleOauthTokens table
  google-tokens.ts    ← upsertToken / getActiveToken / deleteToken
  migrations/0001_*   ← generated migration

features/
  google-calendar-connect/
    ui/connect-button.tsx       ← admin "Connect Google Calendar" CTA
    ui/connection-status.tsx    ← "Connected as foo@gmail.com · last refresh 2m ago"
    api/start.ts                ← server action: build OAuth URL + set CSRF cookie
    api/disconnect.ts           ← server action: delete row + revoke token
    index.ts

app/[locale]/admin/integrations/google/
  page.tsx                       ← status + connect/disconnect surface

app/api/integrations/google/callback/route.ts
                                 ← OAuth redirect target

app/api/booking/slots/route.ts
                                 ← GET ?date=YYYY-MM-DD&serviceId=signature

views/booking/ui/steps/time-step.tsx
                                 ← swaps static array for /api/booking/slots fetch
```

### 3.2 Layering rules (FSD)

- `shared/lib/google-calendar/` is pure logic. No Next.js, no DB, no environment
  reads. Easy to unit-test, easy to swap implementations.
- `db/google-tokens.ts` is the only place that reads or writes the token table.
- `features/google-calendar-connect/` owns admin-facing UI.
- Route handlers (`app/api/...`) compose `db/google-tokens` + `shared/lib/google-calendar`
  — they are thin orchestration layers.

## 4. Data flow

### 4.1 Connect flow

1. Admin lands on `/[locale]/admin/integrations/google`. Page calls `getActiveToken(userId)` server-side; if present, shows status. Otherwise shows "Connect" CTA.
2. CTA hits a server action `startGoogleOAuth()` which:
   - Generates a 32-byte CSRF token.
   - Sets `gcal_oauth_state` cookie (`httpOnly`, `secure`, `sameSite=lax`, `path=/api/integrations/google`, 10 min TTL).
   - Returns the Google OAuth consent URL with:
     - `client_id=$GOOGLE_CLIENT_ID`
     - `redirect_uri=$GOOGLE_OAUTH_REDIRECT_URI`
     - `response_type=code`
     - `scope=openid email https://www.googleapis.com/auth/calendar.readonly`
     - `access_type=offline`
     - `prompt=consent` (forces refresh_token even on re-consent)
     - `state=<csrf>`
3. Browser follows the URL → Google consent → Google redirects to `/api/integrations/google/callback?code=...&state=<csrf>`.
4. Callback handler:
   - Verifies `state` matches the `gcal_oauth_state` cookie (timing-safe compare). 400 otherwise.
   - Calls `auth()` to get the current Auth.js session. 401 if missing.
   - Exchanges `code` for tokens via `POST https://oauth2.googleapis.com/token`.
   - Fetches userinfo (`email`) and calendar list (or just uses `"primary"`).
   - Upserts `{ userId, email, refreshToken, calendarId, scope, lastRefreshAt: now() }` into `google_oauth_tokens`.
   - Clears the CSRF cookie.
   - Redirects to `/[locale]/admin/integrations/google?status=connected`.

### 4.2 Read flow

1. `time-step.tsx` calls `GET /api/booking/slots?date=2026-05-21&serviceId=signature`.
2. Route handler:
   - Looks up service duration from `entities/studio/model/data.ts` (60min default if not found).
   - Cache key = `${calendarId}:${dateISO}:${serviceDurationMin}`. Hit → return.
   - Loads the active token row via `getActiveToken()` which selects `ORDER BY connectedAt DESC LIMIT 1`. (v1 assumes one admin; the ordering is deterministic so a future multi-admin upgrade only changes the query.)
   - If no row → return `computeAvailableSlots(WEEKLY_DEFAULT_HOURS, [], service, tz)` — pure static fallback.
   - Else: refresh access token if `lastRefreshAt IS NULL` or `lastRefreshAt < now() - 50 min` (Google access tokens live 1h; null means we've never refreshed yet).
   - Calls `POST https://www.googleapis.com/calendar/v3/freeBusy` with `[startOfDay, endOfDay]` in salon TZ.
   - Calls `computeAvailableSlots(WEEKLY_DEFAULT_HOURS, busy, service, tz)`.
   - Cache + return `{ slots: ["10:00","10:30",...], source: "gcal" | "static" }`.

**API contract:** The endpoint is intentionally per-day. The booking UI's time step already operates on a single selected date, so a per-day call is the natural shape. A future range endpoint can be added if the date strip ever needs pre-warmed slot counts; that's out of scope for PR 3.

### 4.3 Disconnect flow

1. Admin clicks "Disconnect" in the status card.
2. Server action calls `POST https://oauth2.googleapis.com/revoke` with the refresh token, then deletes the DB row regardless of revoke success.
3. Page re-renders showing the "Connect" CTA.

## 5. DB schema addition

```ts
export const googleOauthTokens = pgTable("google_oauth_tokens", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  calendarId: text("calendar_id").notNull().default("primary"),
  scope: text("scope").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  lastRefreshAt: timestamp("last_refresh_at", { withTimezone: true }),
});

export type GoogleOauthToken = typeof googleOauthTokens.$inferSelect;
export type NewGoogleOauthToken = typeof googleOauthTokens.$inferInsert;
```

One row per connected admin. Cascade-deletes if the user is removed. No index
needed beyond the PK — lookup is always by `userId` or "most recent
`connectedAt`".

`db/google-tokens.ts` follows the existing convention set by `db/users.ts`:
one file per logical table, exporting the typed query/upsert helpers. The
helper module is the only place that reads/writes this table.

## 6. Slot computation

Pure function (`shared/lib/google-calendar/slots.ts`):

```ts
export interface WorkingWindow { dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; startTime: string; endTime: string; }
export interface BusyWindow { start: Date; end: Date; }

export function computeAvailableSlots(args: {
  workingHours: WorkingWindow[];     // weekly recurring
  busy: BusyWindow[];                // absolute UTC instants from Google
  serviceDurationMin: number;
  dayISO: string;                    // "2026-05-21" in salon TZ
  timeZone: string;                  // "Europe/Minsk"
  granularityMin?: number;           // default 30
}): string[];                        // ["10:00","10:30","11:00",...]
```

**Algorithm:**

1. Find working window(s) for `dayISO`'s day-of-week in salon TZ. Empty → return `[]`.
2. Enumerate 30-min slots from window start to (window end − serviceDurationMin), inclusive.
3. For each candidate `[start, start + serviceDurationMin)`, drop if it intersects any busy window.
4. Return slot start times as `"HH:MM"` strings in salon TZ.

**TZ handling:** All arithmetic is done with `Intl.DateTimeFormat` + ISO-string parsing to avoid `Date` quirks across DST boundaries. Belarus does not observe DST so the salon TZ has a fixed +03:00 offset, but the algorithm must still work in TZs that do — tested explicitly.

## 7. Error handling

| Failure | Behavior |
|---|---|
| CSRF state mismatch | Callback returns 400; admin sees `?error=csrf` notice |
| No Auth.js session at callback | 401 from callback |
| Token exchange fails | Redirect to admin with `?error=token_exchange`; show inline notice |
| `GOOGLE_CLIENT_ID` env missing | Connect button shows "Google integration not configured" notice (same shape as Telegram fallback) |
| Refresh token rejected (revoked elsewhere) | Delete row; slot API falls back to static for subsequent calls |
| Google `freeBusy` 5xx or 429 | Use stale cache if any; else fall back to static, log the error |
| `serviceId` not found in service data | Use 60min default, log warning |
| Browser hits `/api/booking/slots` while admin is mid-OAuth | Fallback to static — no race, no half-state |

## 8. Security

- Refresh token stored plaintext; relies on Supabase Row-Level Security + Postgres SSL. The DB connection in `db/index.ts` already uses the Supabase service role (the only mode that bypasses RLS), so *every* route that touches `google_oauth_tokens` — callback, disconnect, and `/api/booking/slots` — uses that connection. The token value is never serialized into a response body or rendered to the client. Document this in `ONBOARDING.md`.
- CSRF state is short-lived (10 min), HMAC'd via random bytes, single-use.
- Callback route validates Auth.js session before exchanging code — prevents an attacker from completing a connect flow for someone else.
- Only `calendar.readonly` scope. No write access. We cannot create events, modify events, or read attachments.
- `GOOGLE_OAUTH_REDIRECT_URI` is locked at the Google Cloud console — only the configured production URL is valid. Preview deploys will need a separate Google project or won't be testable.

## 9. Testing

### 9.1 Unit (Vitest)

- `shared/lib/google-calendar/slots.test.ts`:
  - empty busy + full working day → all slots
  - one busy window covering 13:00–14:00 → those slots dropped
  - busy window touching slot boundary → adjacent slots stay
  - service duration exceeds remaining working window → trailing slots dropped
  - day outside working week (Sunday) → `[]`
  - DST-observing TZ (e.g. `Europe/London`) round-trip
- `shared/lib/google-calendar/oauth.test.ts`:
  - `buildAuthUrl` produces URL with all required params, including `prompt=consent`
  - `exchangeCode` / `refreshAccessToken` shape mocked with `fetch` stub
- `db/google-tokens.test.ts`:
  - upsert overwrites existing row for same `userId`
  - returns `null` when `db` is null (no DATABASE_URL)

### 9.2 Integration

- `app/api/booking/slots/route.test.ts`:
  - no token row → returns static fallback
  - token row + mocked Google `freeBusy` → returns computed slots
  - cache hit on second call within 60s

### 9.3 E2E (Playwright)

- `e2e/booking-slots.spec.ts`:
  - happy path: `/en/booking/time` renders some slots without errors (CI has no Google creds → exercises fallback path)

OAuth callback path is intentionally not e2e-tested (would require a test Google account). Manual smoke test on Vercel before merging.

## 10. Env additions

```
GOOGLE_CLIENT_ID=...                                       # required to enable connect flow
GOOGLE_CLIENT_SECRET=...                                   # required to enable connect flow
GOOGLE_OAUTH_REDIRECT_URI=https://<host>/api/integrations/google/callback
GOOGLE_CALENDAR_ID=primary                                 # optional
NEXT_PUBLIC_BOOKING_TIMEZONE=Europe/Minsk                  # optional, defaults to Europe/Minsk
```

`.env.example` and `ONBOARDING.md` get matching updates.

## 11. Open questions / risks

- **Preview deploys can't test OAuth** without per-environment Google clients. Plan: keep the connect button visible but it will fail at Google's redirect_uri check on previews. That's fine — flow is staged through production.
- **Multi-admin** isn't supported in v1 (one token row, queried by "first active"). If we ever have two admins, change the query to pick by `users.role = 'admin'` ordered by `connectedAt`.
- **DST**: covered in tests but the salon TZ (Europe/Minsk) doesn't observe DST. If the studio ever opens a branch in a DST-observing TZ, re-test.
- **Refresh token rotation**: Google rotates refresh tokens after ~6 months of inactivity. Active use keeps them valid indefinitely. Document re-connect steps in `ONBOARDING.md`.

## 12. Acceptance criteria

- [ ] Admin can click "Connect Google Calendar" on `/admin/integrations/google` and complete the OAuth round-trip on production.
- [ ] After connecting, `/en/booking/time` shows real free slots for the next 14 days, with windows occupied in Google Calendar removed.
- [ ] Disconnecting removes the DB row and the slot API immediately reverts to static.
- [ ] CI passes: lint + Vitest + Playwright + Lighthouse + build.
- [ ] No regressions in existing booking flow when Google is not configured (CI environment).
