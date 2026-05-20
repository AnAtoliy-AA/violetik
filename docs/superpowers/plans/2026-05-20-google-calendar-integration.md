# Google Calendar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the booking flow's hardcoded slot grid with real free slots derived by subtracting Google Calendar busy windows from the studio's working hours, plus a per-admin connect/disconnect UI.

**Architecture:** Pure logic in `shared/lib/google-calendar/` (OAuth, free/busy, slot computation). One DB table (`google_oauth_tokens`). Three new routes (OAuth start, OAuth callback, slots GET) + one admin page. Feature slice `features/google-calendar-connect/` owns the admin UI. Booking `time-step.tsx` swaps its static array for a `/api/booking/slots` fetch. Graceful fallback to the existing static slots when no token row exists or Google is misconfigured.

**Tech Stack:** Next.js 16 App Router, Auth.js v5, Drizzle + Supabase, next-intl, Vitest, Playwright, FSD layering.

**Spec:** [docs/superpowers/specs/2026-05-20-google-calendar-integration-design.md](../specs/2026-05-20-google-calendar-integration-design.md)

---

## File map (all paths absolute from repo root)

| File | Status | Responsibility |
|---|---|---|
| `db/schema.ts` | modify | Add `googleOauthTokens` table + type exports |
| `db/schema.test.ts` | modify | Type-shape assertion for new table |
| `db/google-tokens.ts` | create | Typed upsert / getActive / delete helpers |
| `db/migrations/0001_*.sql` | create (generated) | Drizzle migration |
| `shared/lib/google-calendar/types.ts` | create | Public types (`OAuthTokens`, `BusyWindow`, `WorkingWindow`) |
| `shared/lib/google-calendar/oauth.ts` | create | `buildAuthUrl`, `exchangeCode`, `refreshAccessToken` |
| `shared/lib/google-calendar/oauth.test.ts` | create | URL shape + mocked fetch tests |
| `shared/lib/google-calendar/free-busy.ts` | create | `fetchBusyWindows(calendarId, range, accessToken)` |
| `shared/lib/google-calendar/free-busy.test.ts` | create | Mocked fetch tests |
| `shared/lib/google-calendar/slots.ts` | create | Pure `computeAvailableSlots()` |
| `shared/lib/google-calendar/slots.test.ts` | create | 6+ TDD cases incl. DST |
| `shared/lib/google-calendar/working-hours.ts` | create | `WEEKLY_DEFAULT_HOURS` constant + tz helper |
| `shared/lib/google-calendar/index.ts` | create | Public API barrel |
| `features/google-calendar-connect/api/start.ts` | create | Server action: build URL + CSRF cookie |
| `features/google-calendar-connect/api/disconnect.ts` | create | Server action: revoke + delete |
| `features/google-calendar-connect/ui/connect-button.tsx` | create | Admin CTA |
| `features/google-calendar-connect/ui/connect-button.stories.tsx` | create | Storybook |
| `features/google-calendar-connect/ui/connect-button.test.tsx` | create | Render + click |
| `features/google-calendar-connect/ui/connection-status.tsx` | create | Status card |
| `features/google-calendar-connect/ui/connection-status.stories.tsx` | create | Storybook |
| `features/google-calendar-connect/ui/connection-status.test.tsx` | create | Render |
| `features/google-calendar-connect/index.ts` | create | Public API barrel |
| `app/api/integrations/google/callback/route.ts` | create | OAuth redirect target |
| `app/api/integrations/google/callback/route.test.ts` | create | Mocked fetch + DB-null tests |
| `app/api/booking/slots/route.ts` | create | `GET ?date&serviceId` endpoint |
| `app/api/booking/slots/route.test.ts` | create | Fallback + happy path |
| `app/api/booking/slots/cache.ts` | create | 60s LRU keyed by `${calId}:${dateISO}:${durationMin}` |
| `app/api/booking/slots/cache.test.ts` | create | TTL + key isolation |
| `app/[locale]/admin/integrations/google/page.tsx` | create | Composes the feature, auth-gated |
| `views/booking/ui/steps/time-step.tsx` | modify | Replace static array with API fetch |
| `views/booking/ui/steps/time-step.test.tsx` | create | Loading + fallback render |
| `e2e/booking-slots.spec.ts` | create | Smoke — page renders without GCal creds |
| `messages/en.json` | modify | New `Admin.integrations.google.*` keys |
| `messages/ru.json` | modify | Same |
| `messages/be.json` | modify | Same |
| `.env.example` | modify | `GOOGLE_*` + `NEXT_PUBLIC_BOOKING_TIMEZONE` |
| `ONBOARDING.md` | modify | "Google Calendar" section: Cloud project setup, env vars, RLS note |

---

## Task 1: DB schema — `google_oauth_tokens` table

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/schema.test.ts`
- Create: `db/migrations/0001_*.sql` (generated)

- [ ] **Step 1.1: Append the table definition to `db/schema.ts`**

After the existing `bookings` table, add:

```ts
/**
 * One row per admin who has connected their Google Calendar via OAuth.
 * v1 ships single-admin only; the table supports multi-admin already
 * (PK is userId, queries pick "most recent connectedAt").
 * Refresh token is stored plaintext — relies on Supabase RLS + service-
 * role-only access pattern; see docs/superpowers/specs/...integration-design.md §8.
 */
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

- [ ] **Step 1.2: Extend `db/schema.test.ts`**

Add to the imports:

```ts
import { googleOauthTokens } from "./schema";
import type { GoogleOauthToken, NewGoogleOauthToken } from "./schema";
```

Add a new `it()` block at the end of the describe:

```ts
it("declares the google_oauth_tokens table with the expected shape", () => {
  expect(googleOauthTokens).toBeDefined();
  const _insert: NewGoogleOauthToken = {
    userId: "tg:1",
    email: "v@example.com",
    refreshToken: "1//xxx",
    scope: "openid email https://www.googleapis.com/auth/calendar.readonly",
  };
  const _select: Pick<GoogleOauthToken, "userId" | "calendarId" | "connectedAt"> = {
    userId: "tg:1",
    calendarId: "primary",
    connectedAt: new Date(),
  };
  expect(_insert.userId).toBe("tg:1");
  expect(_select.calendarId).toBe("primary");
});
```

- [ ] **Step 1.3: Run the test — expect PASS**

`npx vitest run db/schema.test.ts`

The new assertion is a type-level invariant that catches future column drift, not a red/green driver — the schema change in Step 1.1 already makes it pass. Run it to confirm the assertion typechecks.

- [ ] **Step 1.4: Generate the migration**

`npm run db:generate`

Expected: a new file `db/migrations/0001_<random_name>.sql` is created with `CREATE TABLE google_oauth_tokens (...)`.

- [ ] **Step 1.5: Sanity-check the generated SQL**

Read the new migration file. Confirm:
- `CREATE TABLE "google_oauth_tokens"` with all five non-PK columns
- `PRIMARY KEY ("user_id")`
- `REFERENCES "users"("id") ON DELETE cascade`

If anything is off, fix the schema and regenerate.

- [ ] **Step 1.6: Commit**

```bash
git add db/schema.ts db/schema.test.ts db/migrations/
git commit -m "feat(db): google_oauth_tokens table + migration"
```

---

## Task 2: Slot computation (TDD heart of the feature)

**Files:**
- Create: `shared/lib/google-calendar/types.ts`
- Create: `shared/lib/google-calendar/slots.ts`
- Create: `shared/lib/google-calendar/slots.test.ts`

- [ ] **Step 2.1: Write the types file**

```ts
// shared/lib/google-calendar/types.ts
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun, 6 = Sat

export interface WorkingWindow {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface BusyWindow {
  start: Date; // absolute instant
  end: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  scope: string;
  email?: string;
}

export interface SlotComputationInput {
  workingHours: WorkingWindow[];
  busy: BusyWindow[];
  serviceDurationMin: number;
  dayISO: string;          // "YYYY-MM-DD" interpreted in `timeZone`
  timeZone: string;        // IANA tz, e.g. "Europe/Minsk"
  granularityMin?: number; // default 30
}
```

- [ ] **Step 2.2: Write the failing tests**

```ts
// shared/lib/google-calendar/slots.test.ts
import { describe, it, expect } from "vitest";
import { computeAvailableSlots } from "./slots";
import type { WorkingWindow, BusyWindow } from "./types";

const MINSK_TUE_10_TO_19: WorkingWindow[] = [
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
];

function busy(startISO: string, endISO: string): BusyWindow {
  return { start: new Date(startISO), end: new Date(endISO) };
}

describe("computeAvailableSlots", () => {
  it("returns every 30-min start from 10:00 up to (19:00 - duration) when no busy windows", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 60,
      dayISO: "2026-05-19", // Tuesday
      timeZone: "Europe/Minsk",
    });
    // 10:00 ... 18:00 inclusive (last 60-min slot starts at 18:00, ends 19:00)
    expect(slots[0]).toBe("10:00");
    expect(slots.at(-1)).toBe("18:00");
    expect(slots).toHaveLength(17); // 09 windows * 2 - 1 (the 18:30 start would overflow)
  });

  it("drops slots that overlap a busy window", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [busy("2026-05-19T10:00:00+03:00", "2026-05-19T11:00:00+03:00")],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
  });

  it("keeps slots that touch a busy boundary exactly (busy.end == slot.start)", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [busy("2026-05-19T10:00:00+03:00", "2026-05-19T11:00:00+03:00")],
      serviceDurationMin: 60,
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    expect(slots).toContain("11:00");
  });

  it("drops trailing slots that don't fit before the working window ends", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 150, // 2.5h services
      dayISO: "2026-05-19",
      timeZone: "Europe/Minsk",
    });
    // last possible start = 19:00 - 2:30 = 16:30
    expect(slots.at(-1)).toBe("16:30");
  });

  it("returns [] for a day with no working window (Sunday)", () => {
    const slots = computeAvailableSlots({
      workingHours: MINSK_TUE_10_TO_19,
      busy: [],
      serviceDurationMin: 60,
      dayISO: "2026-05-17", // Sunday
      timeZone: "Europe/Minsk",
    });
    expect(slots).toEqual([]);
  });

  it("handles DST transition in a DST-observing TZ", () => {
    // Europe/London spring-forward 2026-03-29: 01:00 → 02:00 UTC
    const londonHours: WorkingWindow[] = [
      { dayOfWeek: 0, startTime: "00:30", endTime: "04:00" },
    ];
    const slots = computeAvailableSlots({
      workingHours: londonHours,
      busy: [],
      serviceDurationMin: 30,
      dayISO: "2026-03-29",
      timeZone: "Europe/London",
    });
    // Algorithm should still emit a contiguous local-time grid; the
    // function returns local "HH:MM" labels, so DST is invisible at this layer.
    expect(slots[0]).toBe("00:30");
    expect(slots).toContain("03:00");
  });
});
```

- [ ] **Step 2.3: Run tests — expect FAIL**

`npx vitest run shared/lib/google-calendar/slots.test.ts`

Expected: all tests fail with "Cannot find module './slots'".

- [ ] **Step 2.4: Implement `slots.ts`**

```ts
// shared/lib/google-calendar/slots.ts
import type { DayOfWeek, SlotComputationInput, WorkingWindow } from "./types";

/**
 * Pure slot derivation. Given the studio's recurring working hours and the
 * set of Google Calendar busy windows for the day, returns the local
 * "HH:MM" start times of slots where a service of `serviceDurationMin`
 * fits without overlapping any busy window.
 */
export function computeAvailableSlots(input: SlotComputationInput): string[] {
  const granularity = input.granularityMin ?? 30;
  const dow = dayOfWeekInTZ(input.dayISO, input.timeZone);
  const windows = input.workingHours.filter((w) => w.dayOfWeek === dow);
  if (windows.length === 0) return [];

  const slots: string[] = [];
  for (const w of windows) {
    const [startH, startM] = parseHM(w.startTime);
    const [endH, endM] = parseHM(w.endTime);
    const windowStartMin = startH * 60 + startM;
    const windowEndMin = endH * 60 + endM;
    const lastStartMin = windowEndMin - input.serviceDurationMin;

    for (let t = windowStartMin; t <= lastStartMin; t += granularity) {
      const slotStart = localTimeToUtc(input.dayISO, formatHM(t), input.timeZone);
      const slotEnd = new Date(slotStart.getTime() + input.serviceDurationMin * 60_000);
      if (!intersectsAny(slotStart, slotEnd, input.busy)) {
        slots.push(formatHM(t));
      }
    }
  }
  return slots;
}

function parseHM(s: string): [number, number] {
  const [h, m] = s.split(":").map((x) => Number.parseInt(x, 10));
  return [h, m];
}

function formatHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function intersectsAny(start: Date, end: Date, busy: { start: Date; end: Date }[]): boolean {
  return busy.some((b) => start < b.end && b.start < end);
}

function dayOfWeekInTZ(dayISO: string, timeZone: string): DayOfWeek {
  // Anchor at midday so DST never flips the day boundary.
  const anchor = new Date(`${dayISO}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone })
    .format(anchor);
  const map: Record<string, DayOfWeek> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[wd];
}

/**
 * Convert a local "YYYY-MM-DD HH:MM" in `timeZone` to a UTC `Date`.
 * We build the UTC instant that, when formatted in `timeZone`, yields
 * the requested local time. Two-step because JS has no first-class
 * "construct a Date in a non-system TZ" API.
 */
function localTimeToUtc(dayISO: string, hm: string, timeZone: string): Date {
  const [h, m] = parseHM(hm);
  // Start with the UTC interpretation, then offset by the TZ's UTC offset.
  const naive = new Date(`${dayISO}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  const tzOffsetMs = getTimeZoneOffsetMs(naive, timeZone);
  return new Date(naive.getTime() - tzOffsetMs);
}

function getTimeZoneOffsetMs(at: Date, timeZone: string): number {
  // Use the "longOffset" formatter (e.g. "GMT+03:00") then parse.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(at);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(tzPart);
  if (!m) return 0;
  const sign = m[1] === "+" ? 1 : -1;
  const h = Number.parseInt(m[2], 10);
  const mm = Number.parseInt(m[3], 10);
  return sign * (h * 60 + mm) * 60_000;
}
```

- [ ] **Step 2.5: Run tests — expect PASS**

`npx vitest run shared/lib/google-calendar/slots.test.ts`

If any test fails, fix the implementation (NOT the test) and re-run.

- [ ] **Step 2.6: Commit**

```bash
git add shared/lib/google-calendar/
git commit -m "feat(gcal): pure slot computation with DST-safe TZ math"
```

---

## Task 3: OAuth helpers (TDD with mocked fetch)

**Files:**
- Create: `shared/lib/google-calendar/oauth.ts`
- Create: `shared/lib/google-calendar/oauth.test.ts`

- [ ] **Step 3.1: Write the failing tests**

```ts
// shared/lib/google-calendar/oauth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAuthUrl, exchangeCode, refreshAccessToken } from "./oauth";

describe("buildAuthUrl", () => {
  it("includes all required Google OAuth params", () => {
    const url = new URL(buildAuthUrl({
      clientId: "abc.apps.googleusercontent.com",
      redirectUri: "https://x.test/cb",
      state: "csrf123",
    }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("abc.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x.test/cb");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("csrf123");
    expect(url.searchParams.get("scope")).toContain("calendar.readonly");
    expect(url.searchParams.get("scope")).toContain("email");
  });
});

describe("exchangeCode", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs to the token endpoint and returns parsed tokens", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        access_token: "ya29.x", refresh_token: "1//y",
        expires_in: 3599, scope: "openid email", token_type: "Bearer",
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const result = await exchangeCode({
      clientId: "id", clientSecret: "sec",
      code: "abc", redirectUri: "https://x.test/cb",
    });
    expect(result).toEqual({
      accessToken: "ya29.x",
      refreshToken: "1//y",
      expiresIn: 3599,
      scope: "openid email",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(String(calledUrl)).toBe("https://oauth2.googleapis.com/token");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("throws when the token endpoint returns non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("invalid_grant", { status: 400 }),
    );
    await expect(exchangeCode({
      clientId: "id", clientSecret: "sec", code: "bad", redirectUri: "x",
    })).rejects.toThrow(/exchange.*400/);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a fresh access token", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        access_token: "ya29.fresh", expires_in: 3599, scope: "openid email",
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const result = await refreshAccessToken({
      clientId: "id", clientSecret: "sec", refreshToken: "1//y",
    });
    expect(result.accessToken).toBe("ya29.fresh");
    expect(result.expiresIn).toBe(3599);
  });
});
```

- [ ] **Step 3.2: Run tests — expect FAIL**

`npx vitest run shared/lib/google-calendar/oauth.test.ts`

Expected: import error, no `oauth.ts` yet.

- [ ] **Step 3.3: Implement `oauth.ts`**

```ts
// shared/lib/google-calendar/oauth.ts
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export function buildAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL(AUTH_ENDPOINT);
  u.searchParams.set("client_id", args.clientId);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", args.state);
  u.searchParams.set("scope", SCOPES);
  return u.toString();
}

export async function exchangeCode(args: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scope: string }> {
  const body = new URLSearchParams({
    code: args.code,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string; refresh_token: string;
    expires_in: number; scope: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    scope: json.scope,
  };
}

export async function refreshAccessToken(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ accessToken: string; expiresIn: number; scope: string }> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string; expires_in: number; scope: string;
  };
  return { accessToken: json.access_token, expiresIn: json.expires_in, scope: json.scope };
}

export async function revokeToken(token: string): Promise<void> {
  // Best-effort. Caller deletes the DB row regardless.
  await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}
```

- [ ] **Step 3.4: Run tests — expect PASS**

`npx vitest run shared/lib/google-calendar/oauth.test.ts`

- [ ] **Step 3.5: Commit**

```bash
git add shared/lib/google-calendar/oauth.ts shared/lib/google-calendar/oauth.test.ts
git commit -m "feat(gcal): OAuth helpers (build URL, exchange, refresh, revoke)"
```

---

## Task 4: Free/busy reader

**Files:**
- Create: `shared/lib/google-calendar/free-busy.ts`
- Create: `shared/lib/google-calendar/free-busy.test.ts`

- [ ] **Step 4.1: Write failing tests**

```ts
// shared/lib/google-calendar/free-busy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBusyWindows } from "./free-busy";

describe("fetchBusyWindows", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs freeBusy and returns parsed Date windows", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        calendars: {
          primary: {
            busy: [
              { start: "2026-05-19T10:00:00Z", end: "2026-05-19T11:00:00Z" },
              { start: "2026-05-19T13:30:00Z", end: "2026-05-19T14:30:00Z" },
            ],
          },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const out = await fetchBusyWindows({
      calendarId: "primary",
      rangeStart: new Date("2026-05-19T00:00:00Z"),
      rangeEnd: new Date("2026-05-19T23:59:59Z"),
      accessToken: "ya29.x",
    });
    expect(out).toHaveLength(2);
    expect(out[0].start.toISOString()).toBe("2026-05-19T10:00:00.000Z");
    expect(out[1].end.toISOString()).toBe("2026-05-19T14:30:00.000Z");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://www.googleapis.com/calendar/v3/freeBusy");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer ya29.x");
  });

  it("returns [] when Google returns an empty busy array", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ calendars: { primary: { busy: [] } } }), {
        status: 200, headers: { "Content-Type": "application/json" },
      }),
    );
    const out = await fetchBusyWindows({
      calendarId: "primary",
      rangeStart: new Date(), rangeEnd: new Date(),
      accessToken: "x",
    });
    expect(out).toEqual([]);
  });

  it("throws on non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    await expect(fetchBusyWindows({
      calendarId: "primary", rangeStart: new Date(), rangeEnd: new Date(), accessToken: "x",
    })).rejects.toThrow(/freeBusy.*500/);
  });
});
```

- [ ] **Step 4.2: Run tests — expect FAIL**

- [ ] **Step 4.3: Implement `free-busy.ts`**

```ts
// shared/lib/google-calendar/free-busy.ts
import type { BusyWindow } from "./types";

const FREE_BUSY_ENDPOINT = "https://www.googleapis.com/calendar/v3/freeBusy";

export async function fetchBusyWindows(args: {
  calendarId: string;
  rangeStart: Date;
  rangeEnd: Date;
  accessToken: string;
}): Promise<BusyWindow[]> {
  const res = await fetch(FREE_BUSY_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: args.rangeStart.toISOString(),
      timeMax: args.rangeEnd.toISOString(),
      items: [{ id: args.calendarId }],
    }),
  });
  if (!res.ok) {
    throw new Error(`freeBusy request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    calendars: Record<string, { busy: { start: string; end: string }[] }>;
  };
  const entry = json.calendars[args.calendarId] ?? { busy: [] };
  return entry.busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}
```

- [ ] **Step 4.4: Run tests — expect PASS**

- [ ] **Step 4.5: Commit**

```bash
git add shared/lib/google-calendar/free-busy.ts shared/lib/google-calendar/free-busy.test.ts
git commit -m "feat(gcal): freeBusy reader"
```

---

## Task 5: Working hours default + barrel export

**Files:**
- Create: `shared/lib/google-calendar/working-hours.ts`
- Create: `shared/lib/google-calendar/index.ts`

- [ ] **Step 5.1: Add working hours constant**

```ts
// shared/lib/google-calendar/working-hours.ts
import type { WorkingWindow } from "./types";

/**
 * The fallback weekly schedule until the admin working-hours editor
 * ships in PR 4. Tue – Sat 10:00 – 19:00, no Sunday/Monday.
 */
export const WEEKLY_DEFAULT_HOURS: WorkingWindow[] = [
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" }, // Tue
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" }, // Wed
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" }, // Thu
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" }, // Fri
  { dayOfWeek: 6, startTime: "10:00", endTime: "19:00" }, // Sat
];

export const DEFAULT_TIMEZONE = "Europe/Minsk";

export function bookingTimeZone(): string {
  return process.env.NEXT_PUBLIC_BOOKING_TIMEZONE ?? DEFAULT_TIMEZONE;
}
```

- [ ] **Step 5.2: Add barrel `index.ts`**

```ts
// shared/lib/google-calendar/index.ts
export { computeAvailableSlots } from "./slots";
export { fetchBusyWindows } from "./free-busy";
export {
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  revokeToken,
} from "./oauth";
export {
  WEEKLY_DEFAULT_HOURS,
  DEFAULT_TIMEZONE,
  bookingTimeZone,
} from "./working-hours";
export type {
  WorkingWindow,
  BusyWindow,
  OAuthTokens,
  DayOfWeek,
  SlotComputationInput,
} from "./types";
```

- [ ] **Step 5.3: Commit**

```bash
git add shared/lib/google-calendar/working-hours.ts shared/lib/google-calendar/index.ts
git commit -m "feat(gcal): default working hours + public barrel"
```

---

## Task 6: DB helper for `google_oauth_tokens`

**Files:**
- Create: `db/google-tokens.ts`

(No dedicated test file — `db/users.ts` follows the same no-test convention. The schema invariant test in Task 1 covers the type shape; the helpers are exercised by the route-handler tests in later tasks.)

- [ ] **Step 6.1: Implement helpers**

```ts
// db/google-tokens.ts
import { desc, eq } from "drizzle-orm";
import { db, schema } from "./index";

export interface GoogleTokenUpsert {
  userId: string;
  email: string;
  refreshToken: string;
  calendarId?: string;
  scope: string;
}

/**
 * Inserts a new google_oauth_tokens row or updates the existing one for
 * the same admin (PK = userId). Bumps lastRefreshAt to now() since a
 * fresh OAuth exchange just happened.
 *
 * Returns null when DATABASE_URL is unset — callers should treat that
 * as "persistence skipped" and surface a UI notice.
 */
export async function upsertGoogleToken(
  payload: GoogleTokenUpsert,
): Promise<schema.GoogleOauthToken | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .insert(schema.googleOauthTokens)
    .values({
      userId: payload.userId,
      email: payload.email,
      refreshToken: payload.refreshToken,
      calendarId: payload.calendarId ?? "primary",
      scope: payload.scope,
      lastRefreshAt: now,
    })
    .onConflictDoUpdate({
      target: schema.googleOauthTokens.userId,
      set: {
        email: payload.email,
        refreshToken: payload.refreshToken,
        calendarId: payload.calendarId ?? "primary",
        scope: payload.scope,
        connectedAt: now,
        lastRefreshAt: now,
      },
    })
    .returning();
  return rows[0] ?? null;
}

/**
 * Returns the most recently connected token row. v1 is single-admin so
 * this is just "the row" — but the ORDER BY makes the choice
 * deterministic if/when a second admin connects.
 */
export async function getActiveGoogleToken(): Promise<schema.GoogleOauthToken | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.googleOauthTokens)
    .orderBy(desc(schema.googleOauthTokens.connectedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteGoogleToken(userId: string): Promise<void> {
  if (!db) return;
  await db.delete(schema.googleOauthTokens).where(eq(schema.googleOauthTokens.userId, userId));
}

export async function updateLastRefresh(userId: string): Promise<void> {
  if (!db) return;
  await db
    .update(schema.googleOauthTokens)
    .set({ lastRefreshAt: new Date() })
    .where(eq(schema.googleOauthTokens.userId, userId));
}
```

- [ ] **Step 6.2: Commit**

```bash
git add db/google-tokens.ts
git commit -m "feat(db): google-tokens helper (upsert/getActive/delete)"
```

---

## Task 7: OAuth start server action

**Files:**
- Create: `features/google-calendar-connect/api/start.ts`

- [ ] **Step 7.1: Implement the server action**

```ts
// features/google-calendar-connect/api/start.ts
"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildAuthUrl } from "@/shared/lib/google-calendar";

const CSRF_COOKIE = "gcal_oauth_state";
const CSRF_TTL_S = 600;

export async function startGoogleOAuth(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Google OAuth env vars not configured");
  }
  const state = randomBytes(24).toString("base64url");
  const c = await cookies();
  c.set(CSRF_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_TTL_S,
  });
  redirect(buildAuthUrl({ clientId, redirectUri, state }));
}

export const GCAL_CSRF_COOKIE = CSRF_COOKIE;
```

- [ ] **Step 7.2: Commit**

```bash
git add features/google-calendar-connect/api/start.ts
git commit -m "feat(gcal): startGoogleOAuth server action"
```

---

## Task 8: OAuth callback route

**Files:**
- Create: `app/api/integrations/google/callback/route.ts`
- Create: `app/api/integrations/google/callback/route.test.ts`

- [ ] **Step 8.1: Write failing tests**

```ts
// app/api/integrations/google/callback/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth() before importing the route
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "tg:1" } })),
}));
vi.mock("@/db/google-tokens", () => ({
  upsertGoogleToken: vi.fn(async () => ({ userId: "tg:1" })),
}));

import { GET } from "./route";
import { upsertGoogleToken } from "@/db/google-tokens";

function reqWithCookie(url: string, cookie: string): Request {
  return new Request(url, { headers: { cookie } });
}

describe("GET /api/integrations/google/callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://x.test/api/integrations/google/callback";
  });

  it("400s when state cookie doesn't match", async () => {
    const res = await GET(reqWithCookie(
      "https://x.test/api/integrations/google/callback?code=abc&state=BAD",
      "gcal_oauth_state=GOOD",
    ));
    expect(res.status).toBe(400);
  });

  it("exchanges code, upserts token, redirects on success", async () => {
    vi.spyOn(global, "fetch")
      // exchangeCode → tokens
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "ya29.x", refresh_token: "1//y",
        expires_in: 3599, scope: "openid email",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      // userinfo → email
      .mockResolvedValueOnce(new Response(JSON.stringify({
        email: "v@example.com",
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const res = await GET(reqWithCookie(
      "https://x.test/api/integrations/google/callback?code=abc&state=OK",
      "gcal_oauth_state=OK",
    ));
    expect(res.status).toBe(307); // Next.js redirect
    expect(res.headers.get("location")).toContain("/admin/integrations/google");
    expect(upsertGoogleToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: "tg:1",
      refreshToken: "1//y",
      email: "v@example.com",
    }));
  });
});
```

- [ ] **Step 8.2: Run tests — expect FAIL** (route file doesn't exist).

- [ ] **Step 8.3: Implement the route**

```ts
// app/api/integrations/google/callback/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCode } from "@/shared/lib/google-calendar";
import { upsertGoogleToken } from "@/db/google-tokens";
import { GCAL_CSRF_COOKIE } from "@/features/google-calendar-connect/api/start";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(req, GCAL_CSRF_COOKIE);

  if (!code || !state || !cookieState || !timingSafeStringEqual(state, cookieState)) {
    return new Response("invalid_state", { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthenticated", { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return new Response("not_configured", { status: 500 });
  }

  try {
    const tokens = await exchangeCode({ clientId, clientSecret, code, redirectUri });
    const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const userinfo = userinfoRes.ok
      ? (await userinfoRes.json() as { email?: string })
      : {};
    await upsertGoogleToken({
      userId: session.user.id,
      email: userinfo.email ?? "unknown",
      refreshToken: tokens.refreshToken,
      scope: tokens.scope,
    });
    const dest = new URL("/admin/integrations/google?status=connected", url.origin);
    const res = NextResponse.redirect(dest);
    res.cookies.delete(GCAL_CSRF_COOKIE);
    return res;
  } catch (err) {
    console.error("[gcal callback]", err);
    const dest = new URL("/admin/integrations/google?error=exchange", url.origin);
    return NextResponse.redirect(dest);
  }
}
```

- [ ] **Step 8.4: Run tests — expect PASS**

- [ ] **Step 8.5: Commit**

```bash
git add app/api/integrations/google/callback/
git commit -m "feat(gcal): OAuth callback route with CSRF + session check"
```

---

## Task 9: Disconnect server action

**Files:**
- Create: `features/google-calendar-connect/api/disconnect.ts`

- [ ] **Step 9.1: Implement**

```ts
// features/google-calendar-connect/api/disconnect.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { deleteGoogleToken, getActiveGoogleToken } from "@/db/google-tokens";
import { revokeToken } from "@/shared/lib/google-calendar";

export async function disconnectGoogleCalendar(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const existing = await getActiveGoogleToken();
  if (existing) {
    await revokeToken(existing.refreshToken);
    await deleteGoogleToken(existing.userId);
  }
  revalidatePath("/[locale]/admin/integrations/google", "page");
}
```

- [ ] **Step 9.2: Commit**

```bash
git add features/google-calendar-connect/api/disconnect.ts
git commit -m "feat(gcal): disconnect server action"
```

---

## Task 10: Admin UI components

**Files:**
- Create: `features/google-calendar-connect/ui/connect-button.tsx`
- Create: `features/google-calendar-connect/ui/connect-button.stories.tsx`
- Create: `features/google-calendar-connect/ui/connect-button.test.tsx`
- Create: `features/google-calendar-connect/ui/connection-status.tsx`
- Create: `features/google-calendar-connect/ui/connection-status.stories.tsx`
- Create: `features/google-calendar-connect/ui/connection-status.test.tsx`
- Create: `features/google-calendar-connect/index.ts`

- [ ] **Step 10.1: ConnectButton component**

```tsx
// features/google-calendar-connect/ui/connect-button.tsx
import { startGoogleOAuth } from "../api/start";
import { buttonClassName } from "@/shared/ui/button";

export interface ConnectButtonProps {
  label: string;
}

export function ConnectButton({ label }: ConnectButtonProps) {
  return (
    <form action={startGoogleOAuth}>
      <button type="submit" className={buttonClassName({ variant: "solid", size: "md" })}>
        {label}
      </button>
    </form>
  );
}
```

- [ ] **Step 10.2: ConnectionStatus component**

```tsx
// features/google-calendar-connect/ui/connection-status.tsx
import { disconnectGoogleCalendar } from "../api/disconnect";
import { buttonClassName } from "@/shared/ui/button";

export interface ConnectionStatusProps {
  email: string;
  connectedAt: Date;
  disconnectLabel: string;
  connectedLabel: string;
}

export function ConnectionStatus({
  email, connectedAt, disconnectLabel, connectedLabel,
}: ConnectionStatusProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border-[0.5px] border-line bg-surface p-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {connectedLabel}
        </div>
        <div className="mt-1 text-sm text-text">{email}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
          {connectedAt.toISOString().slice(0, 10)}
        </div>
      </div>
      <form action={disconnectGoogleCalendar}>
        <button type="submit" className={buttonClassName({ variant: "outline", size: "sm" })}>
          {disconnectLabel}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 10.3: Stories**

```tsx
// features/google-calendar-connect/ui/connect-button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectButton } from "./connect-button";

const meta: Meta<typeof ConnectButton> = {
  title: "features/google-calendar-connect/ConnectButton",
  component: ConnectButton,
  args: { label: "Connect Google Calendar" },
};
export default meta;
export const Default: StoryObj<typeof meta> = {};
```

```tsx
// features/google-calendar-connect/ui/connection-status.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectionStatus } from "./connection-status";

const meta: Meta<typeof ConnectionStatus> = {
  title: "features/google-calendar-connect/ConnectionStatus",
  component: ConnectionStatus,
  args: {
    email: "v@example.com",
    connectedAt: new Date("2026-05-19T10:00:00Z"),
    disconnectLabel: "Disconnect",
    connectedLabel: "Connected",
  },
};
export default meta;
export const Default: StoryObj<typeof meta> = {};
```

- [ ] **Step 10.4: Tests**

```tsx
// features/google-calendar-connect/ui/connect-button.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConnectButton } from "./connect-button";

describe("ConnectButton", () => {
  it("renders the label", () => {
    render(<ConnectButton label="Connect Google Calendar" />);
    expect(screen.getByRole("button", { name: /connect google calendar/i })).toBeInTheDocument();
  });
});
```

```tsx
// features/google-calendar-connect/ui/connection-status.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConnectionStatus } from "./connection-status";

describe("ConnectionStatus", () => {
  it("renders the connected email and disconnect button", () => {
    render(
      <ConnectionStatus
        email="v@example.com"
        connectedAt={new Date("2026-05-19T00:00:00Z")}
        disconnectLabel="Disconnect"
        connectedLabel="Connected"
      />,
    );
    expect(screen.getByText("v@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 10.5: Barrel**

```ts
// features/google-calendar-connect/index.ts
export { ConnectButton } from "./ui/connect-button";
export { ConnectionStatus } from "./ui/connection-status";
export { startGoogleOAuth, GCAL_CSRF_COOKIE } from "./api/start";
export { disconnectGoogleCalendar } from "./api/disconnect";
```

- [ ] **Step 10.6: Run lint + Vitest, then commit**

```bash
npm run lint && npx vitest run features/google-calendar-connect/
git add features/google-calendar-connect/
git commit -m "feat(gcal): admin UI components (ConnectButton + ConnectionStatus)"
```

---

## Task 11: Admin integrations page + i18n strings

**Files:**
- Create: `app/[locale]/admin/integrations/google/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `messages/be.json`

- [ ] **Step 11.1: Add translation keys**

Add a new top-level namespace `AdminGoogle` to each messages file. English content:

```jsonc
// messages/en.json — add at the top level
"AdminGoogle": {
  "meta_title": "Google Calendar",
  "eyebrow": "Integrations · Google",
  "hero_title": "Connect the studio calendar",
  "hero_paragraph": "Sign in once with the Google account that hosts the studio's working calendar. We read free/busy windows to show real availability on the booking page.",
  "cta_connect": "Connect Google Calendar",
  "status_connected": "Connected",
  "status_disconnect": "Disconnect",
  "error_csrf": "Connection request expired. Please try again.",
  "error_exchange": "Google rejected the connection. Please retry.",
  "not_configured": "Google OAuth env vars are not configured on the server."
}
```

Mirror in Russian / Belarusian — keep meaning, translate idiomatically. (Style note: the existing translations use the casual "you" form.)

- [ ] **Step 11.2: Admin page**

```tsx
// app/[locale]/admin/integrations/google/page.tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { getActiveGoogleToken } from "@/db/google-tokens";
import { ConnectButton, ConnectionStatus } from "@/features/google-calendar-connect";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminGoogle" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function AdminGoogleRoute({
  params,
}: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const session = await auth();
    if (!session) redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("AdminGoogle");
  const token = await getActiveGoogleToken();
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_OAUTH_REDIRECT_URI);

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("meta_title")} />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">{t("hero_paragraph")}</p>
      </section>

      <section className="px-[22px] pt-2 pb-10">
        {!configured ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
            {t("not_configured")}
          </p>
        ) : token ? (
          <ConnectionStatus
            email={token.email}
            connectedAt={token.connectedAt}
            disconnectLabel={t("status_disconnect")}
            connectedLabel={t("status_connected")}
          />
        ) : (
          <ConnectButton label={t("cta_connect")} />
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 11.3: Run lint + build + commit**

```bash
npm run lint
git add app/[locale]/admin/integrations/google/ messages/
git commit -m "feat(gcal): admin integrations page + i18n strings"
```

---

## Task 12: Slots API route + in-memory cache

**Files:**
- Create: `app/api/booking/slots/cache.ts`
- Create: `app/api/booking/slots/cache.test.ts`
- Create: `app/api/booking/slots/route.ts`
- Create: `app/api/booking/slots/route.test.ts`

- [ ] **Step 12.1: Write failing cache tests**

```ts
// app/api/booking/slots/cache.test.ts
import { describe, it, expect, vi } from "vitest";
import { slotCache } from "./cache";

describe("slotCache", () => {
  it("returns the value within TTL and undefined after", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T10:00:00Z"));
    slotCache.set("k", ["10:00", "10:30"]);
    expect(slotCache.get("k")).toEqual(["10:00", "10:30"]);

    vi.setSystemTime(new Date("2026-05-19T10:00:59Z"));
    expect(slotCache.get("k")).toEqual(["10:00", "10:30"]);

    vi.setSystemTime(new Date("2026-05-19T10:01:01Z"));
    expect(slotCache.get("k")).toBeUndefined();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 12.2: Implement cache**

```ts
// app/api/booking/slots/cache.ts
const TTL_MS = 60_000;

interface Entry { slots: string[]; expiresAt: number; }
const store = new Map<string, Entry>();

export const slotCache = {
  get(key: string): string[] | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.slots;
  },
  set(key: string, slots: string[]): void {
    store.set(key, { slots, expiresAt: Date.now() + TTL_MS });
  },
  clear(): void {
    store.clear();
  },
};
```

- [ ] **Step 12.3: Run cache tests — expect PASS**

- [ ] **Step 12.4: Write failing route tests**

```ts
// app/api/booking/slots/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn(async () => null),
  updateLastRefresh: vi.fn(async () => undefined),
}));

import { GET } from "./route";
import { slotCache } from "./cache";
import { getActiveGoogleToken } from "@/db/google-tokens";

describe("GET /api/booking/slots", () => {
  beforeEach(() => {
    slotCache.clear();
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_BOOKING_TIMEZONE = "Europe/Minsk";
  });

  it("falls back to static slots when no token row exists", async () => {
    vi.mocked(getActiveGoogleToken).mockResolvedValueOnce(null);
    const res = await GET(new Request("https://x.test/api/booking/slots?date=2026-05-19&serviceId=signature"));
    expect(res.status).toBe(200);
    const json = await res.json() as { source: string; slots: string[] };
    expect(json.source).toBe("static");
    expect(json.slots.length).toBeGreaterThan(0);
  });

  it("returns slots derived from freeBusy when a token exists", async () => {
    vi.mocked(getActiveGoogleToken).mockResolvedValueOnce({
      userId: "tg:1", email: "v@x", refreshToken: "1//y",
      calendarId: "primary", scope: "openid",
      connectedAt: new Date(), lastRefreshAt: new Date(Date.now() - 10 * 60_000),
    } as never);
    vi.spyOn(global, "fetch")
      // refresh access token
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "fresh", expires_in: 3599, scope: "openid",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      // freeBusy
      .mockResolvedValueOnce(new Response(JSON.stringify({
        calendars: {
          primary: { busy: [
            { start: "2026-05-19T07:00:00Z", end: "2026-05-19T08:00:00Z" }, // 10:00–11:00 Minsk
          ]},
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    const res = await GET(new Request("https://x.test/api/booking/slots?date=2026-05-19&serviceId=signature"));
    const json = await res.json() as { source: string; slots: string[] };
    expect(json.source).toBe("gcal");
    expect(json.slots).not.toContain("10:00");
    expect(json.slots).toContain("11:00");
  });
});
```

- [ ] **Step 12.5: Implement route**

```ts
// app/api/booking/slots/route.ts
import {
  WEEKLY_DEFAULT_HOURS,
  bookingTimeZone,
  computeAvailableSlots,
  fetchBusyWindows,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import { getActiveGoogleToken, updateLastRefresh } from "@/db/google-tokens";
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

  // No token → static fallback (existing behaviour)
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

    // Access tokens are not persisted (in-memory only), so every cache
    // miss does a refresh. lastRefreshAt is purely a bookkeeping field
    // — bump it at most once per REFRESH_THRESHOLD_MS to avoid a write
    // per request.
    const { accessToken: liveAccess } = await refreshAccessToken({
      clientId, clientSecret, refreshToken: token.refreshToken,
    });
    const shouldBumpLastRefresh =
      !token.lastRefreshAt ||
      Date.now() - token.lastRefreshAt.getTime() > REFRESH_THRESHOLD_MS;
    if (shouldBumpLastRefresh) await updateLastRefresh(token.userId);

    const rangeStart = new Date(`${dayISO}T00:00:00Z`);
    const rangeEnd = new Date(`${dayISO}T23:59:59Z`);
    const busy = await fetchBusyWindows({
      calendarId: token.calendarId,
      rangeStart, rangeEnd,
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
```

- [ ] **Step 12.6: Run all route tests — expect PASS**

`npx vitest run app/api/booking/slots/`

- [ ] **Step 12.7: Commit**

```bash
git add app/api/booking/slots/
git commit -m "feat(gcal): /api/booking/slots route with 60s LRU cache + static fallback"
```

---

## Task 13: Wire booking time-step to the API

**Files:**
- Modify: `views/booking/ui/steps/time-step.tsx`
- Create: `views/booking/ui/steps/time-step.test.tsx` (if not present)

- [ ] **Step 13.1: Write failing test for the new behaviour**

```tsx
// views/booking/ui/steps/time-step.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { TimeStep } from "./time-step";

// Pre-populate the Zustand store with a date + service selection.
import { useBookingStore } from "@/views/booking/model/booking-store";

describe("TimeStep", () => {
  beforeEach(() => {
    useBookingStore.setState({ date: "2026-05-19", time: null, serviceId: "signature" });
    vi.restoreAllMocks();
  });

  it("fetches /api/booking/slots and renders the returned slots", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ source: "static", slots: ["10:00", "10:30"] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TimeStep />
      </NextIntlClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("10:00")).toBeInTheDocument());
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("renders a fallback list if the fetch fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("net"));
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TimeStep />
      </NextIntlClientProvider>,
    );
    await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThan(0));
  });
});
```

- [ ] **Step 13.2: Replace the static array with API-driven state**

Open `views/booking/ui/steps/time-step.tsx`. Replace the static `BOOKING_TIMES` / `RESERVED` constants with a `useEffect` + `useState` that fetches `/api/booking/slots?date=<date>&serviceId=<service>` and renders the response.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { BOOKING_TIMES, formatLongDate } from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";

const STATIC_FALLBACK: readonly string[] = BOOKING_TIMES;

export function TimeStep() {
  const t = useTranslations("Booking.time");
  const locale = useLocale();
  const selected = useBookingStore((s) => s.time);
  const setTime = useBookingStore((s) => s.setTime);
  const date = useBookingStore((s) => s.date);
  const serviceId = useBookingStore((s) => s.serviceId);

  const [slots, setSlots] = useState<readonly string[]>(STATIC_FALLBACK);

  useEffect(() => {
    if (!date || !serviceId) return;
    const controller = new AbortController();
    fetch(`/api/booking/slots?date=${date}&serviceId=${serviceId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json: { slots?: string[] }) => {
        if (Array.isArray(json.slots)) setSlots(json.slots);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => controller.abort();
  }, [date, serviceId]);

  const dateLabel = date ? formatLongDate(date, locale) : null;

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-[36px] font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <p className="m-0 mb-5 text-sm text-text-2">
        {dateLabel ? (
          <>
            <span className="text-gold">{dateLabel}</span> · {t("zone_suffix")}
          </>
        ) : (
          t("no_date")
        )}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {slots.map((slot) => {
          const isSelected = selected === slot;
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTime(slot)}
              className={cn(
                "rounded-[18px] border-[0.5px] px-4 py-5 text-left",
                "transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                isSelected
                  ? "border-accent bg-[color-mix(in_oklab,var(--color-accent)_16%,var(--color-surface))] text-accent"
                  : "border-line bg-surface text-text hover:border-line-strong",
              )}
            >
              <div className="font-display text-[26px] font-normal italic leading-none">
                {slot}
              </div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] opacity-70">
                {t("available")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

Note: `RESERVED_TIMES` is no longer referenced; leave the constant in `booking-steps.ts` (don't delete) — it stays as documentation of the old behaviour.

- [ ] **Step 13.3: No store change needed**

The store already exposes `serviceId` (verified at `views/booking/model/booking-store.ts`). Skip this step entirely.

- [ ] **Step 13.4: Run tests — expect PASS**

`npx vitest run views/booking/ui/steps/time-step.test.tsx`

- [ ] **Step 13.5: Commit**

```bash
git add views/booking/ui/steps/time-step.tsx views/booking/ui/steps/time-step.test.tsx
git commit -m "feat(booking): time-step fetches real slots from /api/booking/slots"
```

---

## Task 14: E2E smoke test

**Files:**
- Create: `e2e/booking-slots.spec.ts`

- [ ] **Step 14.1: Implement smoke**

```ts
// e2e/booking-slots.spec.ts
import { test, expect } from "@playwright/test";

// CI runs without GOOGLE_* — the API route should fall back to static.
test("booking time step renders slots without Google credentials", async ({ page }) => {
  await page.goto("/en/booking/time");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  // At least one slot button rendered (fallback path).
  const slotGrid = page.locator('div.grid button:has-text(":")');
  await expect(slotGrid.first()).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 14.2: Run e2e locally if no other dev server is running**

```bash
# stop any local `next dev` first
npx playwright test e2e/booking-slots.spec.ts
```

- [ ] **Step 14.3: Commit**

```bash
git add e2e/booking-slots.spec.ts
git commit -m "test(e2e): booking slots fallback path renders without GCal"
```

---

## Task 15: Env + ONBOARDING

**Files:**
- Modify: `.env.example`
- Modify: `ONBOARDING.md`

- [ ] **Step 15.1: `.env.example`**

Append:

```
# Google Calendar — admin connect flow
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://your-host.example/api/integrations/google/callback
GOOGLE_CALENDAR_ID=primary
NEXT_PUBLIC_BOOKING_TIMEZONE=Europe/Minsk
```

- [ ] **Step 15.2: `ONBOARDING.md`**

Add a new section "Google Calendar (admin)":

```
### Google Calendar (admin)

The admin connects her Google Calendar from `/admin/integrations/google`.
We read free/busy windows to compute booking slots; we do not write events.

1. Create a Google Cloud project (one-off).
2. Enable the Google Calendar API.
3. OAuth consent screen → External, scopes: `openid`, `email`,
   `https://www.googleapis.com/auth/calendar.readonly`.
4. Credentials → OAuth Client ID → Web application.
   Authorized redirect URI: `https://<your-host>/api/integrations/google/callback`.
5. Copy Client ID + Secret into Vercel env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REDIRECT_URI`
6. Deploy, then sign in as the admin and click "Connect Google Calendar".

**Security note:** refresh tokens are stored plaintext in
`google_oauth_tokens`. Access goes through the Supabase service-role
connection only; the value never leaves the server.
```

- [ ] **Step 15.3: Commit**

```bash
git add .env.example ONBOARDING.md
git commit -m "docs: Google Calendar setup steps in ONBOARDING + .env.example"
```

---

## Task 16: Final verification + open PR

- [ ] **Step 16.1: Full verification**

```bash
npm run lint
npm test
npm run build
```

Expected: all three pass with no warnings/errors related to our changes.

- [ ] **Step 16.2: Push branch**

```bash
git push -u origin feature/google-calendar
```

- [ ] **Step 16.3: Open PR using the project's pr-description skill (or manually)**

```bash
gh pr create --base develop --title "feat(gcal): Google Calendar OAuth + free/busy slot reader (PR 3)" --body "$(cat <<'EOF'
## Summary

- Admin connects Google Calendar from `/admin/integrations/google` (OAuth, refresh token persisted in `google_oauth_tokens`).
- New `/api/booking/slots?date&serviceId` derives real slots by subtracting Google busy windows from the studio's working hours (hardcoded Tue–Sat 10:00–19:00 until the editor lands in PR 4).
- Booking time step now consumes the API; falls back to the existing static array when no token row is present or Google is misconfigured.
- 60s in-memory cache, CSRF-protected callback, only `calendar.readonly` scope.

## Test plan

- [ ] `npm run lint` clean
- [ ] `npm test` — 165+ Vitest tests pass, including new `slots.test.ts` (DST round-trip, busy-window subtraction, etc.)
- [ ] `npm run build` succeeds
- [ ] `npm run e2e -- booking-slots.spec.ts` — booking time page renders slots without GCal env vars
- [ ] Manual on Vercel preview: connect a test Google account → `/en/booking/time` shows real availability

Refs spec: `docs/superpowers/specs/2026-05-20-google-calendar-integration-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 16.4: Confirm PR is open**

```bash
gh pr view --json url,state,statusCheckRollup
```

Done.

---

## Notes for the executing agent

- The "TDD" tasks (Task 2, 3, 4, 8, 12, 13) follow strict red/green: write the failing test first, run it, then write the minimal implementation.
- If a Vitest run prints anything about Storybook stories not found, it's a known harmless warning, not a failure — only fail the task if the `Tests` line shows a non-zero failure count.
- Husky `pre-commit` runs `lint` + `test`. If a commit fails because of a lint/test issue, fix the underlying issue and create a NEW commit — do not `--amend`.
- Husky `pre-push` runs `build`. The build can take ~30s; that's normal.
- The route handler tests use `vi.mock("@/db/google-tokens")` because the DB isn't available in test env — be careful to import the mocked module after the `vi.mock()` call.
