# Booking lead-time guard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block bookings whose start time is in the past or within 3 hours of "now" — on both the server (slot API + submit action) and the client (date strip + time grid).

**Architecture:** One shared constant `MIN_BOOKING_LEAD_MINUTES = 180` and a pure `isTooSoon(scheduledFor, now, minLead)` helper. The slot computation function gets two optional inputs (`now`, `minLeadMinutes`) and silently filters stale candidates when given them. The submit server action calls the helper before any DB write. The client date strip becomes `now`/timezone-aware so past days are not generated, and the time step renders an empty state when the API returns zero slots.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, next-intl, Vitest + Testing Library + jsdom.

**Spec:** [docs/superpowers/specs/2026-05-24-booking-lead-time-design.md](../specs/2026-05-24-booking-lead-time-design.md)

**Branch:** `feature/booking-lead-time-guard` (already created off `develop`; spec committed). PRs target `develop`.

---

## File Structure

### Create

- `views/booking/lib/lead-time.ts` — pure `isTooSoon(scheduledFor, now, minLeadMinutes)` helper.
- `views/booking/lib/lead-time.test.ts` — Vitest for the helper.

### Modify

- `views/booking/lib/booking-steps.ts` — export `MIN_BOOKING_LEAD_MINUTES`; replace `BOOKING_START_ISO` with `bookingStartISO(now, timeZone)`; rewrite `buildDateStrip(locale, timeZone, now?)` to iterate by civil date.
- `views/booking/lib/booking-steps.test.ts` — inject `now`/tz; add new cases.
- `views/booking/ui/steps/date-step.tsx` — accept `timeZone` prop; replace `BOOKING_START_ISO` usage with `bookingStartISO(now, timeZone)`; pass tz/now into `buildDateStrip`.
- `views/booking/ui/booking-page.tsx` — accept `timeZone` prop; thread it to `<DateStep timeZone={timeZone} />`.
- `app/[locale]/booking/[step]/page.tsx` — pass `bookingTimeZoneFromSettings(settings)` into `<BookingPage timeZone={...} />`.
- `shared/lib/google-calendar/types.ts` — add optional `now?: Date` and `minLeadMinutes?: number` to `SlotComputationInput`.
- `shared/lib/google-calendar/slots.ts` — apply the lead-time filter when both are present.
- `shared/lib/google-calendar/slots.test.ts` — new case for the filter.
- `app/api/booking/slots/route.ts` — pass `now: new Date()` and `minLeadMinutes: MIN_BOOKING_LEAD_MINUTES` into all three `computeAvailableSlots` calls.
- `app/api/booking/slots/route.test.ts` — fake-time the existing tests so `2026-05-19` is "today" and adjust one assertion.
- `views/booking/api/submit.ts` — add `"too_soon"` to the `SubmitBookingResult` error union; call `isTooSoon` before any DB write.
- `views/booking/ui/steps/time-step.tsx` — render translated empty state when `slots.length === 0`.
- `messages/en.json`, `messages/ru.json`, `messages/by.json` — `Booking.errors.too_soon`, `Booking.time.none_available`.

### Delete

Nothing.

---

## Conventions

- **Always create work via TDD** (red → green → commit) per `superpowers:test-driven-development`. The failing test belongs in the same commit as the implementation, NOT in a separate commit, so reverts stay coherent.
- Run a single Vitest file via `npx vitest run path/to/file.test.ts`. Run the full Vitest suite via `npm test`.
- Pre-commit (Husky) runs `lint + test`. Pre-push runs `build`. Don't bypass. **Every task in this plan ends with the repo in a green state** — no `--no-verify` shortcuts.
- File paths use `@/*` alias; the alias resolves to repo root (no `src/`).
- FSD: imports point downward only. Server route (`app/`) imports from `views/booking/lib/` (downward — fine). Pure helpers stay free of React/Next imports.
- Use `superpowers:verification-before-completion` before claiming any task done.

---

## Task ordering rationale

Task 2 bundles the `booking-steps.ts` refactor with all four of its TypeScript consumers (`date-step.tsx`, `booking-page.tsx`, the locale route page) in a single commit. This keeps every commit lint+test+build green and avoids the trap of "constant deleted → consumers broken → commit needs `--no-verify`." The time-step empty-state lands separately because it has no compile dependency on the strip refactor.

---

## Task 1: Pure `isTooSoon` helper

**Files:**
- Create: `views/booking/lib/lead-time.ts`
- Create: `views/booking/lib/lead-time.test.ts`

The helper has one job: decide if a UTC instant is too close to (or before) `now` given a minimum lead in minutes. Inlining the logic at every call site would duplicate it; centralising it keeps Task 3 and Task 4 trivially testable.

- [ ] **Step 1: Write the failing test**

```ts
// views/booking/lib/lead-time.test.ts
import { describe, it, expect } from "vitest";
import { isTooSoon } from "./lead-time";

describe("isTooSoon", () => {
  const now = new Date("2026-05-24T12:00:00Z");

  it("returns true when scheduledFor is in the past", () => {
    expect(isTooSoon(new Date("2026-05-24T11:00:00Z"), now, 180)).toBe(true);
  });

  it("returns true when scheduledFor is within the lead window", () => {
    // 2h59m from now, lead = 3h
    expect(isTooSoon(new Date("2026-05-24T14:59:00Z"), now, 180)).toBe(true);
  });

  it("returns false when scheduledFor is exactly at the lead boundary", () => {
    expect(isTooSoon(new Date("2026-05-24T15:00:00Z"), now, 180)).toBe(false);
  });

  it("returns false when scheduledFor is well past the lead window", () => {
    expect(isTooSoon(new Date("2026-05-25T10:00:00Z"), now, 180)).toBe(false);
  });

  it("respects a zero lead (only past instants are too soon)", () => {
    expect(isTooSoon(new Date("2026-05-24T11:59:59Z"), now, 0)).toBe(true);
    expect(isTooSoon(new Date("2026-05-24T12:00:00Z"), now, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run views/booking/lib/lead-time.test.ts`
Expected: FAIL — `Cannot find module './lead-time'`.

- [ ] **Step 3: Implement the helper**

```ts
// views/booking/lib/lead-time.ts
/**
 * Returns true when `scheduledFor` is in the past or fewer than
 * `minLeadMinutes` away from `now`. Pure: no I/O, no clock access.
 *
 * Used by both the slot API (to drop stale candidates) and the
 * submit server action (to reject race-condition submissions).
 */
export function isTooSoon(
  scheduledFor: Date,
  now: Date,
  minLeadMinutes: number,
): boolean {
  return scheduledFor.getTime() - now.getTime() < minLeadMinutes * 60_000;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run views/booking/lib/lead-time.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add views/booking/lib/lead-time.ts views/booking/lib/lead-time.test.ts
git commit -m "feat(booking): pure isTooSoon lead-time helper"
```

---

## Task 2: tz-aware date strip + threaded `timeZone` prop

**Files:**
- Modify: `views/booking/lib/booking-steps.ts`
- Modify: `views/booking/lib/booking-steps.test.ts`
- Modify: `views/booking/ui/steps/date-step.tsx`
- Modify: `views/booking/ui/booking-page.tsx`
- Modify: `app/[locale]/booking/[step]/page.tsx`

Single commit because the constant rename has compile-time consumers. Replace `BOOKING_START_ISO = "2026-05-19"` with a tz-aware function and thread the studio timezone from the server route down to the `DateStep`. The Sun/Mon closed-day rule stays; no new "past" predicate is needed at this layer because the strip starts at today by construction.

- [ ] **Step 1: Rewrite the failing tests for the lib**

Open [views/booking/lib/booking-steps.test.ts](../../views/booking/lib/booking-steps.test.ts). Replace the `"buildDateStrip returns 14 days starting Tue May 19"` test and add the new cases. The final file should have these test cases in addition to the unchanged `isBookingStep` / `nextStep` / `prevStep` / `indexOfStep` / `RESERVED_TIMES` / `formatLongDate` tests:

```ts
import { describe, it, expect } from "vitest";
import {
  BOOKING_STEPS,
  buildDateStrip,
  bookingStartISO,
  formatLongDate,
  indexOfStep,
  isBookingStep,
  MIN_BOOKING_LEAD_MINUTES,
  nextStep,
  prevStep,
  RESERVED_TIMES,
  BOOKING_TIMES,
} from "./booking-steps";

// ...existing tests untouched...

it("bookingStartISO returns the civil date in the studio timezone", () => {
  // 23:30 UTC on Sat → 02:30 Sun in Europe/Minsk (UTC+3)
  expect(
    bookingStartISO(new Date("2026-05-23T23:30:00Z"), "Europe/Minsk"),
  ).toBe("2026-05-24");
  // Same instant in UTC → still Sat
  expect(
    bookingStartISO(new Date("2026-05-23T23:30:00Z"), "UTC"),
  ).toBe("2026-05-23");
});

it("buildDateStrip returns 14 days starting at today's civil date in tz", () => {
  // Tue 2026-05-19 08:00 Europe/Minsk
  const now = new Date("2026-05-19T05:00:00Z");
  const days = buildDateStrip("en-US", "Europe/Minsk", now);
  expect(days).toHaveLength(14);
  expect(days[0].iso).toBe("2026-05-19"); // Tue
  expect(days[13].iso).toBe("2026-06-01"); // Mon two weeks out
  expect(days[0].disabled).toBe(false); // Tue
  expect(days[5].disabled).toBe(true); // Sun
  expect(days[6].disabled).toBe(true); // Mon
});

it("buildDateStrip disables the first cell when today is a closed day", () => {
  // Sunday 2026-05-24 10:00 Europe/Minsk
  const now = new Date("2026-05-24T07:00:00Z");
  const days = buildDateStrip("en-US", "Europe/Minsk", now);
  expect(days[0].iso).toBe("2026-05-24");
  expect(days[0].disabled).toBe(true); // Sun
  expect(days[1].disabled).toBe(true); // Mon
  expect(days[2].disabled).toBe(false); // Tue
});

it("buildDateStrip defaults `now` to the system clock", () => {
  const days = buildDateStrip("en-US", "Europe/Minsk");
  expect(days).toHaveLength(14);
  expect(days[0].iso).toBe(bookingStartISO(new Date(), "Europe/Minsk"));
});

it("MIN_BOOKING_LEAD_MINUTES is the canonical lead-time constant", () => {
  expect(MIN_BOOKING_LEAD_MINUTES).toBe(180);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run views/booking/lib/booking-steps.test.ts`
Expected: FAIL — `bookingStartISO` / `MIN_BOOKING_LEAD_MINUTES` not exported; old signature of `buildDateStrip` rejects the third argument.

- [ ] **Step 3: Update `views/booking/lib/booking-steps.ts`**

Add `MIN_BOOKING_LEAD_MINUTES`, **delete** the `BOOKING_START_ISO` export, and replace the date helpers. Keep `BOOKING_STEPS`, `isBookingStep`, `indexOfStep`, `nextStep`, `prevStep`, `RESERVED_TIMES`, `BOOKING_TIMES`, `formatLongDate`, `formatMonthYear` exactly as they are.

```ts
export const MIN_BOOKING_LEAD_MINUTES = 180;

export interface DateCell {
  iso: string;
  day: number;
  dow: string;
  disabled: boolean;
}

/**
 * Today's civil date (YYYY-MM-DD) in the given timezone. Used as the
 * first cell of the booking date strip — never UTC, because the
 * studio's "today" can differ from UTC by ±3h.
 */
export function bookingStartISO(now: Date, timeZone: string): string {
  // en-CA always formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const DOW_FROM_EN = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
} as const;

function dayOfWeekInTZ(iso: string, timeZone: string): number {
  // 12:00 UTC anchor avoids DST edges.
  const anchor = new Date(`${iso}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(anchor);
  return DOW_FROM_EN[wd as keyof typeof DOW_FROM_EN];
}

function addCivilDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildDateStrip(
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): DateCell[] {
  const start = bookingStartISO(now, timeZone);
  const dowFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 14 }, (_, i) => {
    const iso = addCivilDays(start, i);
    const dayOfWeek = dayOfWeekInTZ(iso, timeZone);
    const dayNum = Number.parseInt(iso.slice(8, 10), 10);
    return {
      iso,
      day: dayNum,
      dow: dowFmt.format(new Date(`${iso}T12:00:00Z`)),
      disabled: dayOfWeek === 0 || dayOfWeek === 1,
    };
  });
}
```

(`addCivilDays` operating in UTC is safe because we only mutate the calendar date, never time-of-day. We then re-evaluate the day-of-week in `timeZone`.)

- [ ] **Step 4: Update `views/booking/ui/steps/date-step.tsx`**

Change the imports and accept the new prop. Only the imports, props, and the two `useMemo` bodies change — the JSX body is identical.

```tsx
"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import {
  bookingStartISO,
  buildDateStrip,
  formatMonthYear,
} from "@/views/booking/lib/booking-steps";
import { useBookingStore } from "@/views/booking/model/booking-store";

export interface DateStepProps {
  timeZone: string;
}

export function DateStep({ timeZone }: DateStepProps) {
  const t = useTranslations("Booking.date");
  const locale = useLocale();
  const selected = useBookingStore((s) => s.date);
  const setDate = useBookingStore((s) => s.setDate);

  const days = useMemo(
    () => buildDateStrip(locale, timeZone),
    [locale, timeZone],
  );
  const monthLabel = useMemo(
    () => formatMonthYear(bookingStartISO(new Date(), timeZone), locale),
    [locale, timeZone],
  );

  // ...rest of return JSX unchanged: header, grid of date buttons, hours card...
}
```

- [ ] **Step 5: Update `views/booking/ui/booking-page.tsx`**

Add `timeZone` to `BookingPageProps`, destructure it, pass it to `<DateStep>`:

```ts
export interface BookingPageProps {
  step: BookingStep;
  services: readonly Service[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
  masters: readonly Master[];
  location: string;
  timeZone: string;
}
```

Add `timeZone` to the destructured args of `BookingPage(...)` and update:

```tsx
{step === "date" ? <DateStep timeZone={timeZone} /> : null}
```

- [ ] **Step 6: Update `app/[locale]/booking/[step]/page.tsx`**

Add the import (`bookingTimeZoneFromSettings` is already re-exported from `@/shared/lib/google-calendar`):

```ts
import { bookingTimeZoneFromSettings } from "@/shared/lib/google-calendar";
```

Inside `BookingRoute`, after the `Promise.all([...settings, services, masters])` line, derive and pass `timeZone`:

```tsx
const timeZone = bookingTimeZoneFromSettings(settings);
// ...
<BookingPage
  step={step}
  services={services}
  pricedServices={pricedServices}
  currency={currency}
  masters={masters}
  location={location}
  timeZone={timeZone}
/>
```

- [ ] **Step 7: Verify `BOOKING_START_ISO` is fully removed**

Run: `git grep -n "BOOKING_START_ISO"`
Expected: zero matches in tracked source. Build artefacts under `.next/` are not tracked, so they won't show up.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: PASS — full suite green. Storybook stories under `views/booking/` are auto-run by Vitest's storybook project; the `<DateStep>` story (if any) must be updated to pass `timeZone`. If [views/booking/ui/steps/date-step.stories.tsx] exists, add `timeZone: "Europe/Minsk"` to its default args; if it does not, no fix is needed.

- [ ] **Step 9: Commit**

```bash
git add views/booking/lib/booking-steps.ts views/booking/lib/booking-steps.test.ts views/booking/ui/steps/date-step.tsx views/booking/ui/booking-page.tsx 'app/[locale]/booking/[step]/page.tsx'
git commit -m "feat(booking): tz-aware date strip + thread timeZone prop"
```

(Husky's pre-commit hook will run `npm run lint && npm test`. Both must pass.)

---

## Task 3: Server-side slot filter

**Files:**
- Modify: `shared/lib/google-calendar/types.ts`
- Modify: `shared/lib/google-calendar/slots.ts`
- Modify: `shared/lib/google-calendar/slots.test.ts`
- Modify: `app/api/booking/slots/route.ts`
- Modify: `app/api/booking/slots/route.test.ts`

`computeAvailableSlots` becomes the single point where stale slots are filtered. Existing callers continue to work when they don't pass `now`/`minLeadMinutes` (no filtering — backwards compatible).

- [ ] **Step 1: Extend the input type**

In [shared/lib/google-calendar/types.ts](../../shared/lib/google-calendar/types.ts), add to `SlotComputationInput`:

```ts
export interface SlotComputationInput {
  workingHours: WorkingWindow[];
  busy: BusyWindow[];
  serviceDurationMin: number;
  dayISO: string;
  timeZone: string;
  granularityMin?: number;
  /** Server "now" — used together with `minLeadMinutes` to drop stale candidates. */
  now?: Date;
  /** Minimum lead time in minutes. Ignored when `now` is omitted. */
  minLeadMinutes?: number;
}
```

- [ ] **Step 2: Write the failing test**

Add at the end of [shared/lib/google-calendar/slots.test.ts](../../shared/lib/google-calendar/slots.test.ts):

```ts
it("drops slots that start within minLeadMinutes of `now`", () => {
  // 2026-05-19 (Tue) 11:00 Europe/Minsk = 08:00 UTC
  const now = new Date("2026-05-19T08:00:00Z");
  const slots = computeAvailableSlots({
    workingHours: MINSK_TUE_10_TO_19,
    busy: [],
    serviceDurationMin: 60,
    dayISO: "2026-05-19",
    timeZone: "Europe/Minsk",
    now,
    minLeadMinutes: 180,
  });
  // Cutoff = 14:00 Europe/Minsk. Slots earlier than 14:00 are dropped;
  // 14:00 itself sits exactly at the boundary and is kept.
  expect(slots).not.toContain("10:00");
  expect(slots).not.toContain("13:30");
  expect(slots).toContain("14:00");
  expect(slots).toContain("17:00");
});

it("does not filter when `now` is omitted (backwards compatible)", () => {
  const slots = computeAvailableSlots({
    workingHours: MINSK_TUE_10_TO_19,
    busy: [],
    serviceDurationMin: 60,
    dayISO: "2026-05-19",
    timeZone: "Europe/Minsk",
    minLeadMinutes: 180, // ignored without `now`
  });
  expect(slots[0]).toBe("10:00");
});
```

- [ ] **Step 3: Run the test to verify the new case fails**

Run: `npx vitest run shared/lib/google-calendar/slots.test.ts`
Expected: FAIL — the "drops slots..." case returns `10:00` instead of starting at `14:00`. Existing tests still pass.

- [ ] **Step 4: Implement the filter**

In [shared/lib/google-calendar/slots.ts](../../shared/lib/google-calendar/slots.ts), inside `computeAvailableSlots`, replace the body of the inner loop:

```ts
for (let t = windowStartMin; t <= lastStartMin; t += granularity) {
  const slotStart = localTimeToUtc(input.dayISO, formatHM(t), input.timeZone);
  const slotEnd = new Date(
    slotStart.getTime() + input.serviceDurationMin * 60_000,
  );
  if (intersectsAny(slotStart, slotEnd, input.busy)) continue;
  if (isBeforeLead(slotStart, input.now, input.minLeadMinutes)) continue;
  slots.push(formatHM(t));
}
```

Add the helper near the other module-local helpers at the bottom of the file:

```ts
function isBeforeLead(
  slotStart: Date,
  now: Date | undefined,
  minLeadMinutes: number | undefined,
): boolean {
  if (!now || minLeadMinutes === undefined) return false;
  return slotStart.getTime() - now.getTime() < minLeadMinutes * 60_000;
}
```

(The duplication with `isTooSoon` from Task 1 is intentional — `shared/lib/google-calendar/` must not reach into `views/`. The function is two lines and unlikely to drift.)

- [ ] **Step 5: Run slots tests to verify they pass**

Run: `npx vitest run shared/lib/google-calendar/slots.test.ts`
Expected: PASS — every test green, including the two new ones.

- [ ] **Step 6: Wire the filter into the route**

In [app/api/booking/slots/route.ts](../../app/api/booking/slots/route.ts), add the import:

```ts
import { MIN_BOOKING_LEAD_MINUTES } from "@/views/booking/lib/booking-steps";
```

Define `const now = new Date();` at the top of `GET`, then add `now` and `minLeadMinutes: MIN_BOOKING_LEAD_MINUTES` to **all three** `computeAvailableSlots(...)` calls (the no-token branch, the gcal happy-path, and the gcal-error fallback). Example for the no-token branch:

```ts
const slots = computeAvailableSlots({
  workingHours: WEEKLY_DEFAULT_HOURS,
  busy: dbBusy,
  serviceDurationMin: durationMin,
  dayISO,
  timeZone: tz,
  now,
  minLeadMinutes: MIN_BOOKING_LEAD_MINUTES,
});
```

- [ ] **Step 7: Make the existing route tests deterministic with fake-time, then adjust the one assertion that's actually affected**

The existing tests in [app/api/booking/slots/route.test.ts](../../app/api/booking/slots/route.test.ts) hit `dayISO=2026-05-19`. With the new filter and the real system clock, that day is past → empty slots → the existing assertions blow up. Pin the clock at the top of the file:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ...mock blocks unchanged...

beforeEach(() => {
  slotCache.clear();
  vi.restoreAllMocks();
  vi.useFakeTimers();
  // Tue 2026-05-19 08:00 Europe/Minsk (= 05:00 UTC). Lead cutoff = 11:00 local.
  vi.setSystemTime(new Date("2026-05-19T05:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_BOOKING_TIMEZONE", "Europe/Minsk");
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "sec");
});

afterEach(() => {
  vi.useRealTimers();
});
```

**Adjust exactly one assertion:** In the `"falls back to static slots when no token row exists"` test, the existing `expect(json.slots[0]).toBe("10:00")` becomes `expect(json.slots[0]).toBe("11:00")` (cutoff is 11:00 Europe/Minsk; the 10:00 slot starts 60min before cutoff and is dropped).

The `"returns slots derived from freeBusy when a token exists"` test's two assertions (`not.toContain("10:00")` and `toContain("11:00")`) stay correct as-is: 10:00 is dropped (was previously dropped by the busy window; now also dropped by lead — outcome identical), and 11:00 is at the lead boundary so it's kept. No edit needed.

- [ ] **Step 8: Run route tests**

Run: `npx vitest run app/api/booking/slots/route.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add shared/lib/google-calendar/types.ts shared/lib/google-calendar/slots.ts shared/lib/google-calendar/slots.test.ts app/api/booking/slots/route.ts app/api/booking/slots/route.test.ts
git commit -m "feat(booking): server-side lead-time filter on slot API"
```

---

## Task 4: Submit-time defensive guard

**Files:**
- Modify: `views/booking/api/submit.ts`

The slots API already strips stale candidates. This guard catches the race condition where a user fetched slots an hour ago, paused, and now submits one that has slipped under the lead cutoff.

- [ ] **Step 1: Add `"too_soon"` to the error union**

In [views/booking/api/submit.ts](../../views/booking/api/submit.ts), modify `SubmitBookingResult`:

```ts
export type SubmitBookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error:
        | "slot_taken"
        | "db_unavailable"
        | "invalid_input"
        | "no_master_available"
        | "master_not_eligible"
        | "too_soon"
        | "unknown";
    };
```

- [ ] **Step 2: Import the helper + constant**

Add to the imports at the top:

```ts
import { MIN_BOOKING_LEAD_MINUTES } from "@/views/booking/lib/booking-steps";
import { isTooSoon } from "@/views/booking/lib/lead-time";
```

- [ ] **Step 3: Insert the guard**

After `const scheduledFor = localToUtc(input.date, input.time, tz);` (currently line 136) and before the `ensureUserRow` try/catch, add:

```ts
if (isTooSoon(scheduledFor, new Date(), MIN_BOOKING_LEAD_MINUTES)) {
  return { ok: false, error: "too_soon" };
}
```

- [ ] **Step 4: Typecheck + run unit tests**

Run: `npx tsc --noEmit`
Expected: PASS — union widens, imports resolve.

Run: `npm test`
Expected: PASS — full suite (no test touches `submitBooking` directly; the helper coverage from Task 1 stays green).

- [ ] **Step 5: Commit**

```bash
git add views/booking/api/submit.ts
git commit -m "feat(booking): reject too_soon submissions in submitBooking"
```

---

## Task 5: Time-step empty state

**Files:**
- Modify: `views/booking/ui/steps/time-step.tsx`

When `/api/booking/slots` returns an empty array (today fully past the cutoff, or a closed day reached via deep link), the user must see a translated message instead of an empty grid. The static fallback (`STATIC_FALLBACK = BOOKING_TIMES`) renders before the first fetch resolves — keep it for SSR continuity.

- [ ] **Step 1: Update component**

In [views/booking/ui/steps/time-step.tsx](../../views/booking/ui/steps/time-step.tsx), track whether the fetch has resolved, and branch the JSX:

```tsx
const [slots, setSlots] = useState<readonly string[]>(STATIC_FALLBACK);
const [hasFetched, setHasFetched] = useState(false);

useEffect(() => {
  if (!date || !serviceId) return;
  const controller = new AbortController();
  fetch(`/api/booking/slots?date=${date}&serviceId=${serviceId}`, {
    signal: controller.signal,
  })
    .then((r) => r.json())
    .then((json: { slots?: string[] }) => {
      if (Array.isArray(json.slots)) setSlots(json.slots);
      setHasFetched(true);
    })
    .catch(() => {
      /* keep STATIC_FALLBACK; do NOT set hasFetched */
    });
  return () => controller.abort();
}, [date, serviceId]);
```

(Important: do not move `setHasFetched(true)` into a `.finally()` — the existing `time-step.test.tsx` covers the fetch-rejection path, which must continue to render the static fallback rather than the empty state.)

Replace the slot-grid block with a conditional:

```tsx
{hasFetched && slots.length === 0 ? (
  <p
    role="status"
    className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-text-3"
  >
    {t("none_available")}
  </p>
) : (
  <div className="grid grid-cols-2 gap-2.5">
    {slots.map((slot) => {
      // ...existing per-slot button JSX unchanged...
    })}
  </div>
)}
```

- [ ] **Step 2: Run the time-step test**

Run: `npx vitest run views/booking/ui/steps/time-step.test.tsx`
Expected: PASS — existing assertions for the static-fallback path and the fetched-non-empty path stay green. The `none_available` key resolves at runtime from messages; the test doesn't need to assert on it unless you choose to add a case for `slots: []`.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add views/booking/ui/steps/time-step.tsx
git commit -m "feat(booking): empty-state copy on time step when no slots"
```

---

## Task 6: Translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `messages/by.json`

Add the two new keys per locale. Pre-existing gap (no `no_master_available` / `master_not_eligible` keys for the corresponding `SubmitBookingResult` errors) is out of scope.

- [ ] **Step 1: Update `messages/en.json`**

Inside `Booking.time` add `none_available`; inside `Booking.errors` add `too_soon`:

```json
"time": {
  "eyebrow": "Step 04 / Time",
  "title": "Choose your <em>hour</em>.",
  "no_date": "Pick a date first to see availability.",
  "none_available": "No times left for this date — please pick another day.",
  "zone_suffix": "Times in studio local time.",
  "reserved": "Reserved",
  "available": "Available"
},
// ...
"errors": {
  "slot_taken": "That slot was just taken. Please pick another.",
  "db_unavailable": "Bookings are temporarily offline. Please try again in a moment.",
  "invalid_input": "Pick a service, date and time before confirming.",
  "too_soon": "This time is too close to now. Bookings need at least 3 hours' notice — please pick another time.",
  "unknown": "Something slipped. Please try again."
}
```

- [ ] **Step 2: Update `messages/ru.json`**

```json
"time": {
  "...existing keys...": "...",
  "none_available": "На эту дату времени не осталось — выберите другой день."
},
"errors": {
  "slot_taken": "Этот слот только что заняли. Выберите другой.",
  "db_unavailable": "Запись временно недоступна. Повторите попытку через минуту.",
  "invalid_input": "Выберите услугу, дату и время перед подтверждением.",
  "too_soon": "Это время слишком близко к сейчас. Записаться можно не позднее, чем за 3 часа — выберите другое время.",
  "unknown": "Что-то пошло не так. Попробуйте ещё раз."
}
```

- [ ] **Step 3: Update `messages/by.json`**

```json
"time": {
  "...existing keys...": "...",
  "none_available": "На гэту дату часу не засталося — выберыце іншы дзень."
},
"errors": {
  "slot_taken": "Гэты слот толькі што заняты. Выберыце іншы.",
  "db_unavailable": "Запіс часова недаступны. Паспрабуйце праз хвіліну.",
  "invalid_input": "Выберыце паслугу, дату і час перад пацверджаннем.",
  "too_soon": "Гэты час занадта блізкі да зараз. Запіс магчымы не пазней, чым за 3 гадзіны — выберыце іншы час.",
  "unknown": "Нешта пайшло не так. Паспрабуйце яшчэ раз."
}
```

- [ ] **Step 4: Verify the JSON parses + run the full suite**

Run: `node -e "['en','ru','by'].forEach(l => JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8'))); console.log('ok')"`
Expected: prints `ok`.

Run: `npm test`
Expected: PASS — story-as-test runs that render the booking page with all locales stay green.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ru.json messages/by.json
git commit -m "i18n(booking): too_soon + none_available copy for en/ru/by"
```

---

## Task 7: Final verification

**Files:** None (commands only).

Per `superpowers:verification-before-completion`: run the full gate and confirm clean before declaring done.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: zero warnings/errors.

- [ ] **Step 2: Unit tests**

Run: `npm test`
Expected: full Vitest run passes (default jsdom + storybook project).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: production build succeeds; no TypeScript errors.

- [ ] **Step 4: Manual smoke**

If a dev server can run in this environment:

1. `npm run dev`
2. Visit `/en/booking/service` → pick a service → master → date.
3. Confirm the first cell of the date strip is **today** (or disabled if today is Sun/Mon).
4. Pick today's date. Confirm the time grid hides slots earlier than `now + 3h`.
5. If today is fully cut off, confirm the `none_available` copy renders.
6. Pick a future date. Confirm the full slot list.
7. Open DevTools → Network → confirm `/api/booking/slots?date=...` payload aligns with the rendered grid.

If the dev server cannot run here, document the gap and leave the manual checklist for the reviewer.

- [ ] **Step 5: Open the PR**

Run: `gh pr create --base develop --title "feat(booking): block past + sub-3h bookings" --body "..."` (use `.claude/skills/pr-description` to draft the body).

---

## Notes / non-tasks

- **No DB schema changes.** The unique index on `bookings.scheduled_for` still protects against double-booking.
- **No GCal-side changes.** Calendar busy windows continue to merge with DB-side ones inside the route — unaffected.
- **Storybook `BOOKING_TIMES` fallback** stays as-is; only the empty-state branch added in Task 5 triggers post-fetch.
- **Pre-existing i18n gap:** `Booking.errors` has no `no_master_available` / `master_not_eligible` keys despite those errors existing in `SubmitBookingResult`. Pre-existing, not in scope.
