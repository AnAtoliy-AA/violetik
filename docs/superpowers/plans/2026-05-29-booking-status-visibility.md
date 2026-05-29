# Booking Status Visibility + GCal Confirm Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show customers their booking status (pending / confirmed / cancelled / completed) with an on-brand badge, and add a daily cron that syncs a Google Calendar confirmation (event `tentative` → `confirmed`) back into the booking row.

**Architecture:** A new `shared/ui/booking-status-badge` pill renders the status everywhere bookings appear in the profile. The profile data layer stops hiding cancelled bookings and buckets them into history. A new daily cron route reads each recent pending booking's GCal event and flips the DB to `confirmed` when the admin marked the event confirmed; the admin-panel confirm path patches the event to match, so both directions agree. A ship-date cutoff prevents legacy pending events (created without an explicit status, which Google treats as confirmed) from auto-confirming on first run.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (CSS-var tokens), Drizzle ORM (Postgres), next-intl (en/ru/by), Vitest + Testing Library, Storybook. Google Calendar v3 REST.

**Spec:** [docs/superpowers/specs/2026-05-29-booking-status-visibility-design.md](../specs/2026-05-29-booking-status-visibility-design.md)

**Branch:** `feat/booking-status-visibility` (already created off `develop`; PR → `develop`).

---

## File Structure

**Create (FSD shared/ui shape — nested `ui/` subdir, per the `new-ui-component` skill):**
- `shared/ui/booking-status-badge/index.ts` — public API (re-exports from `./ui/...`).
- `shared/ui/booking-status-badge/ui/booking-status-badge.tsx` — the pill component.
- `shared/ui/booking-status-badge/ui/booking-status-badge.test.tsx` — Vitest unit test.
- `shared/ui/booking-status-badge/ui/booking-status-badge.stories.tsx` — Storybook story.
- `app/api/cron/booking-gcal-sync/route.ts` — daily confirm-sync cron.
- `app/api/cron/booking-gcal-sync/route.test.ts` — cron route test.

**Modify:**
- `messages/en.json`, `messages/ru.json`, `messages/by.json` — add `Profile.booking_status.*`.
- `entities/booking/lib/bucket-bookings.ts` — cancelled → history.
- `entities/booking/lib/bucket-bookings.test.ts` — update the "excludes cancelled" case.
- `db/bookings.ts` — drop cancelled filter in `listUserBookings`; add `listPendingBookingsWithGcalEvent`; add `GCAL_SYNC_CUTOFF` constant.
- `views/profile/ui/upcoming-bookings.tsx` — render badge (hero + list rows).
- `views/profile/ui/booking-history.tsx` — render badge per row (cancelled keeps "Book again").
- `shared/lib/google-calendar/events.ts` — `status?` param on `createCalendarEvent`; add `getCalendarEvent` + `setCalendarEventStatus`.
- `shared/lib/google-calendar/events.test.ts` — tests for the new/changed helpers (create if absent).
- `shared/lib/google-calendar/index.ts` — export `getCalendarEvent`, `setCalendarEventStatus`.
- `views/booking/api/submit.ts` — create event as `tentative`.
- `features/bookings-admin/api/actions.ts` — `confirmBooking` patches event → `confirmed`.
- `vercel.json` — second daily cron entry.

---

## Task 1: Add i18n status-label keys

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`, `messages/by.json`

The existing `Profile.pending_eyebrow` / `cancelled_eyebrow` keys are eyebrow-style (`"… · #{code}"`) and stay untouched. Add a dedicated short-label group `Profile.booking_status.*` mirroring the admin `bookings.status.*` wording.

- [ ] **Step 1: Add keys to `messages/en.json`** inside the `"Profile"` object (place near `next_visit_eyebrow`):

```json
    "booking_status": {
      "pending": "Pending",
      "confirmed": "Confirmed",
      "cancelled": "Cancelled",
      "completed": "Completed"
    },
```

- [ ] **Step 2: Add to `messages/ru.json`** inside `"Profile"`:

```json
    "booking_status": {
      "pending": "Ожидает",
      "confirmed": "Подтверждено",
      "cancelled": "Отменено",
      "completed": "Завершено"
    },
```

- [ ] **Step 3: Add to `messages/by.json`** inside `"Profile"`:

```json
    "booking_status": {
      "pending": "Чакае",
      "confirmed": "Пацверджана",
      "cancelled": "Адменена",
      "completed": "Завершана"
    },
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "['en','ru','by'].forEach(l=>{const j=require('./messages/'+l+'.json'); if(!j.Profile.booking_status.confirmed) throw new Error('missing '+l); }); console.log('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ru.json messages/by.json
git commit -m "i18n(profile): add booking_status labels (en/ru/by)"
```

---

## Task 2: `BookingStatusBadge` shared/ui component

Follow the `new-ui-component` skill: Tailwind only, **`cn` helper (not `clsx`)**, nested `ui/` subdir, mandatory Storybook story + Vitest test, public `index.ts` re-exporting from `./ui/...`. Reference patterns: [shared/ui/vip-badge/ui/vip-badge.tsx](../../../shared/ui/vip-badge/ui/vip-badge.tsx) (`cn` + per-variant `Record` pill) and [shared/ui/button/](../../../shared/ui/button/) (canonical structure).

Badge is a **dark, opaque** pill (per the project's glass-readability rule — no light tints on the dark/cream theme): dark `bg-scrim` fill + a thin colored border + colored text. The status word is real text (not color-only) for a11y. Label is passed in by the caller (server components already hold the translator), so the component stays presentation-only and locale-agnostic.

**Real tokens** (verified in `app/globals.css`, exposed as Tailwind v4 utilities): `bg-scrim` (dark opaque), `text-status-warn` (#e8b07a amber), `text-status-open` (#7fc7a1 green), `text-rose`, `text-text-3`, `border-line`. The earlier draft's `--color-ink`/`--color-gold-*` tokens **do not exist** — do not use them.

**Files:**
- Create: `shared/ui/booking-status-badge/ui/booking-status-badge.tsx`
- Test: `shared/ui/booking-status-badge/ui/booking-status-badge.test.tsx`
- Create: `shared/ui/booking-status-badge/ui/booking-status-badge.stories.tsx`
- Create: `shared/ui/booking-status-badge/index.ts`

- [ ] **Step 1: Write the failing test**

`shared/ui/booking-status-badge/ui/booking-status-badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BookingStatusBadge } from "./booking-status-badge";

describe("BookingStatusBadge", () => {
  it("renders the provided label text", () => {
    render(<BookingStatusBadge status="pending" label="Pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders an uppercase mono pill", () => {
    render(<BookingStatusBadge status="confirmed" label="Confirmed" />);
    expect(screen.getByText("Confirmed")).toHaveClass("uppercase");
  });

  it("tags each status via data-status", () => {
    const statuses = ["pending", "confirmed", "cancelled", "completed"] as const;
    const seen = new Set<string>();
    for (const s of statuses) {
      const { container, unmount } = render(
        <BookingStatusBadge status={s} label={s} />,
      );
      const attr = container.firstElementChild?.getAttribute("data-status");
      expect(attr).toBe(s);
      seen.add(attr!);
      unmount();
    }
    expect(seen.size).toBe(4);
  });

  it("respects a passed className", () => {
    const { container } = render(
      <BookingStatusBadge status="pending" label="Pending" className="mt-2" />,
    );
    expect(container.firstElementChild).toHaveClass("mt-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/booking-status-badge/ui/booking-status-badge.test.tsx`
Expected: FAIL — cannot resolve `./booking-status-badge`.

- [ ] **Step 3: Write the component**

`shared/ui/booking-status-badge/ui/booking-status-badge.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface BookingStatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement> {
  status: BookingStatus;
  /** Localized status word; caller supplies it (server holds the translator). */
  label: string;
}

// Dark, opaque pills (glass-readability rule): a dark scrim fill with a thin
// colored border + colored text. Tokens from app/globals.css @theme, exposed
// as Tailwind v4 utilities.
const TONE: Record<BookingStatus, string> = {
  pending: "border-status-warn/40 text-status-warn",
  confirmed: "border-status-open/40 text-status-open",
  cancelled: "border-rose/40 text-rose",
  completed: "border-line text-text-3",
};

/**
 * Small status pill shown on booking cards in the profile. Presentation
 * only — the caller passes the already-localized `label`.
 */
export function BookingStatusBadge({
  status,
  label,
  className,
  ...rest
}: BookingStatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center justify-center rounded-full border bg-scrim px-2 py-0.5",
        "font-mono text-[9px] uppercase leading-none tracking-[0.18em]",
        TONE[status],
        className,
      )}
      {...rest}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/ui/booking-status-badge/ui/booking-status-badge.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the public API**

`shared/ui/booking-status-badge/index.ts`:

```ts
export { BookingStatusBadge } from "./ui/booking-status-badge";
export type {
  BookingStatus,
  BookingStatusBadgeProps,
} from "./ui/booking-status-badge";
```

- [ ] **Step 6: Write the Storybook story**

`shared/ui/booking-status-badge/ui/booking-status-badge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookingStatusBadge } from "./booking-status-badge";

const meta: Meta<typeof BookingStatusBadge> = {
  title: "shared/ui/BookingStatusBadge",
  component: BookingStatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["pending", "confirmed", "cancelled", "completed"],
    },
    label: { control: "text" },
  },
  args: { status: "pending", label: "Pending" },
};
export default meta;
type Story = StoryObj<typeof BookingStatusBadge>;

export const Default: Story = {};
export const Pending: Story = { args: { status: "pending", label: "Pending" } };
export const Confirmed: Story = {
  args: { status: "confirmed", label: "Confirmed" },
};
export const Cancelled: Story = {
  args: { status: "cancelled", label: "Cancelled" },
};
export const Completed: Story = {
  args: { status: "completed", label: "Completed" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <BookingStatusBadge status="pending" label="Pending" />
      <BookingStatusBadge status="confirmed" label="Confirmed" />
      <BookingStatusBadge status="cancelled" label="Cancelled" />
      <BookingStatusBadge status="completed" label="Completed" />
    </div>
  ),
};
```

- [ ] **Step 7: Run the component test + lint once more**

Run: `npx vitest run shared/ui/booking-status-badge/ && npx eslint shared/ui/booking-status-badge/`
Expected: tests PASS, eslint clean.

- [ ] **Step 8: Commit**

```bash
git add shared/ui/booking-status-badge/
git commit -m "feat(shared/ui): add BookingStatusBadge pill"
```

---

## Task 3: Bucket cancelled bookings into history

**Files:**
- Modify: `entities/booking/lib/bucket-bookings.ts`
- Test: `entities/booking/lib/bucket-bookings.test.ts`

- [ ] **Step 1: Update the failing test** — replace the existing `"excludes cancelled rows from both buckets"` case (lines ~26-32) with:

```ts
  it("puts cancelled rows into history, newest first", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const older = row({
      id: "bk_old_cancel",
      status: "cancelled",
      scheduledFor: new Date("2025-12-10T10:00:00Z"),
    });
    const newer = row({
      id: "bk_new_cancel",
      status: "cancelled",
      scheduledFor: new Date("2025-12-20T10:00:00Z"),
    });
    const result = bucketBookings([older, newer], now);
    expect(result.upcoming).toHaveLength(0);
    expect(result.history.map((r) => r.id)).toEqual([
      "bk_new_cancel",
      "bk_old_cancel",
    ]);
  });

  it("interleaves cancelled and completed in history by date desc", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const completed = row({
      id: "bk_done",
      status: "completed",
      scheduledFor: new Date("2025-12-15T10:00:00Z"),
    });
    const cancelled = row({
      id: "bk_cx",
      status: "cancelled",
      scheduledFor: new Date("2025-12-25T10:00:00Z"),
    });
    const result = bucketBookings([completed, cancelled], now);
    expect(result.history.map((r) => r.id)).toEqual(["bk_cx", "bk_done"]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run entities/booking/lib/bucket-bookings.test.ts`
Expected: FAIL — cancelled rows currently excluded (history length 0).

- [ ] **Step 3: Update `bucket-bookings.ts`** — replace the cancelled `continue` (lines ~24-28) and the doc comment so cancelled joins history:

```ts
  for (const row of rows) {
    if (row.status === "completed" || row.status === "cancelled") {
      history.push(row);
      continue;
    }
    // pending or confirmed
    if (row.scheduledFor.getTime() > now.getTime()) {
      upcoming.push(row);
    }
    // past pending/confirmed are ambiguous — admin should reconcile;
    // we omit them rather than misclassify.
  }
```

Also update the function's doc comment: "History = completed or cancelled (newest first)."

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run entities/booking/lib/bucket-bookings.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add entities/booking/lib/bucket-bookings.ts entities/booking/lib/bucket-bookings.test.ts
git commit -m "feat(entities/booking): bucket cancelled bookings into history"
```

---

## Task 4: Stop hiding cancelled in `listUserBookings`

**Files:**
- Modify: `db/bookings.ts` (the `listUserBookings` query, ~line 200-231)

`listUserBookings` is used only by the profile loader ([views/profile/api/loaders.ts](../../../views/profile/api/loaders.ts)); slot/active logic uses `listActiveBookingsFrom`, so removing the cancelled filter here is safe.

- [ ] **Step 1: Remove the cancelled filter.** In `listUserBookings`, change the `.where(...)` from:

```ts
    .where(
      and(
        eq(schema.bookings.userId, userId),
        ne(schema.bookings.status, "cancelled"),
      ),
    )
```

to:

```ts
    .where(eq(schema.bookings.userId, userId))
```

Update the function's doc comment (drop "excluding cancelled rows"; note it returns all statuses and the view buckets them). Leave the `ne` import in place if still used elsewhere in the file (it is — `listActiveBookingsFrom`).

- [ ] **Step 2: Typecheck + full test run** (no dedicated unit test for this DB fn; rely on type + downstream)

Run: `npx tsc --noEmit && npx vitest run entities/booking/`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add db/bookings.ts
git commit -m "feat(db/bookings): include cancelled rows in listUserBookings"
```

---

## Task 5: Render badge in Upcoming bookings

**Files:**
- Modify: `views/profile/ui/upcoming-bookings.tsx`

- [ ] **Step 1: Import the badge + a status-label helper.** Add import:

```tsx
import { BookingStatusBadge } from "@/shared/ui/booking-status-badge";
```

Inside the component (after `t` is available), add:

```tsx
  const statusLabel = (row: UserBookingRow): string =>
    t(`booking_status.${row.status}`);
```

- [ ] **Step 2: Add the badge to the hero card.** Right after the `<Eyebrow>` line and before the service-name `<p>`, render the badge inline with the eyebrow row (or directly under it):

```tsx
        <div className="mt-3 flex items-center gap-2">
          <BookingStatusBadge status={next.status} label={statusLabel(next)} />
        </div>
```

Adjust the existing `mt-3` on the service-name `<p>` to `mt-2` so spacing stays tight.

- [ ] **Step 3: Add the badge to each "other upcoming" row.** Inside the `<li>`'s `min-w-0` block, after the date `<p>`, add:

```tsx
                <div className="mt-1">
                  <BookingStatusBadge
                    status={row.status}
                    label={statusLabel(row)}
                  />
                </div>
```

- [ ] **Step 4: Verify the profile view still renders (typecheck + lint)**

Run: `npx tsc --noEmit && npx eslint views/profile/ui/upcoming-bookings.tsx`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add views/profile/ui/upcoming-bookings.tsx
git commit -m "feat(profile): show status badge on upcoming bookings"
```

---

## Task 6: Render badge in Booking history

**Files:**
- Modify: `views/profile/ui/booking-history.tsx`

Cancelled rows **keep** the "Book this again" CTA (decided).

- [ ] **Step 1: Import the badge.** Add:

```tsx
import { BookingStatusBadge } from "@/shared/ui/booking-status-badge";
```

- [ ] **Step 2: Add a status-label helper** after `t` is destructured:

```tsx
  const statusLabel = (status: (typeof completedHistory)[number]["status"]) =>
    t(`booking_status.${status}`);
```

- [ ] **Step 3: Render the badge** inside each row's `min-w-0` block, after the date `<p>`:

```tsx
            <div className="mt-1">
              <BookingStatusBadge
                status={row.status}
                label={statusLabel(row.status)}
              />
            </div>
```

Note: the local var is named `completedHistory` but now also contains cancelled rows — rename it to `recentHistory` for clarity (update both the declaration and the two usages: the `.length === 0` check and the `.map`).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint views/profile/ui/booking-history.tsx`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add views/profile/ui/booking-history.tsx
git commit -m "feat(profile): show status badge in booking history"
```

---

## Task 7: GCal — create as tentative + read/patch helpers

**Files:**
- Modify: `shared/lib/google-calendar/events.ts`
- Test: `shared/lib/google-calendar/events.test.ts` (create if it doesn't exist)
- Modify: `shared/lib/google-calendar/index.ts`

- [ ] **Step 1: Write failing tests** in `shared/lib/google-calendar/events.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createCalendarEvent,
  getCalendarEvent,
  setCalendarEventStatus,
} from "./events";

afterEach(() => vi.restoreAllMocks());

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
    }),
  );
}

describe("createCalendarEvent", () => {
  it("sends the requested event status in the body", async () => {
    const spy = mockFetch(200, { id: "evt_1" });
    await createCalendarEvent({
      calendarId: "primary",
      accessToken: "tok",
      summary: "s",
      start: new Date("2026-06-01T10:00:00Z"),
      end: new Date("2026-06-01T11:00:00Z"),
      timeZone: "Europe/Warsaw",
      status: "tentative",
    });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.status).toBe("tentative");
  });
});

describe("getCalendarEvent", () => {
  it("returns the event status on 200", async () => {
    mockFetch(200, { id: "evt_1", status: "confirmed" });
    const evt = await getCalendarEvent({
      calendarId: "primary",
      eventId: "evt_1",
      accessToken: "tok",
    });
    expect(evt?.status).toBe("confirmed");
  });

  it("returns null on 404/410", async () => {
    mockFetch(404, "gone");
    const evt = await getCalendarEvent({
      calendarId: "primary",
      eventId: "evt_x",
      accessToken: "tok",
    });
    expect(evt).toBeNull();
  });

  it("throws on other errors", async () => {
    mockFetch(500, "boom");
    await expect(
      getCalendarEvent({
        calendarId: "primary",
        eventId: "evt_1",
        accessToken: "tok",
      }),
    ).rejects.toThrow();
  });
});

describe("setCalendarEventStatus", () => {
  it("PATCHes the event status", async () => {
    const spy = mockFetch(200, { id: "evt_1", status: "confirmed" });
    await setCalendarEventStatus({
      calendarId: "primary",
      eventId: "evt_1",
      accessToken: "tok",
      status: "confirmed",
    });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string).status).toBe("confirmed");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run shared/lib/google-calendar/events.test.ts`
Expected: FAIL — `getCalendarEvent` / `setCalendarEventStatus` not exported; `status` not in create body.

- [ ] **Step 3: Implement in `events.ts`.** Add `status` to `createCalendarEvent`'s args and body, and add the two new functions:

```ts
export async function createCalendarEvent(args: {
  calendarId: string;
  accessToken: string;
  summary: string;
  start: Date;
  end: Date;
  timeZone: string;
  description?: string;
  status?: "tentative" | "confirmed";
}): Promise<string> {
  const res = await fetch(EVENTS_ENDPOINT(args.calendarId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: args.summary,
      description: args.description,
      status: args.status,
      start: { dateTime: args.start.toISOString(), timeZone: args.timeZone },
      end: { dateTime: args.end.toISOString(), timeZone: args.timeZone },
      transparency: "opaque",
    }),
  });
  if (!res.ok) {
    throw new Error(`events insert failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

/**
 * Reads one event. Returns null on 404/410 (event gone) so callers can
 * treat a missing event as "nothing to sync". Throws on other errors.
 */
export async function getCalendarEvent(args: {
  calendarId: string;
  eventId: string;
  accessToken: string;
}): Promise<{ status: string } | null> {
  const url = `${EVENTS_ENDPOINT(args.calendarId)}/${encodeURIComponent(args.eventId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) {
    throw new Error(`events get failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { status?: string };
  return { status: json.status ?? "confirmed" };
}

/** Best-effort PATCH of an event's status (tentative/confirmed). */
export async function setCalendarEventStatus(args: {
  calendarId: string;
  eventId: string;
  accessToken: string;
  status: "tentative" | "confirmed";
}): Promise<void> {
  const url = `${EVENTS_ENDPOINT(args.calendarId)}/${encodeURIComponent(args.eventId)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: args.status }),
  });
  if (res.status === 404 || res.status === 410) return;
  if (!res.ok) {
    throw new Error(`events patch failed: ${res.status} ${await res.text()}`);
  }
}
```

- [ ] **Step 4: Export the new helpers** in `shared/lib/google-calendar/index.ts`:

```ts
export {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  setCalendarEventStatus,
} from "./events";
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run shared/lib/google-calendar/events.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/lib/google-calendar/events.ts shared/lib/google-calendar/events.test.ts shared/lib/google-calendar/index.ts
git commit -m "feat(gcal): event status param + getCalendarEvent/setCalendarEventStatus"
```

---

## Task 8: Create new booking events as tentative

**Files:**
- Modify: `views/booking/api/submit.ts` (the `createCalendarEvent` call, ~line 227)

- [ ] **Step 1: Pass `status: "tentative"`** in the `createCalendarEvent({...})` call:

```tsx
      const eventId = await createCalendarEvent({
        calendarId: token.calendarId,
        accessToken,
        summary: `${localizedServiceName(service, input.locale)}${masterLabel} · ${customerLabel}`,
        description: `Violetta booking ${booking.id}\nStatus: pending`,
        start: scheduledFor,
        end,
        timeZone: tz,
        status: "tentative",
      });
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add views/booking/api/submit.ts
git commit -m "feat(booking): create GCal event as tentative for pending bookings"
```

---

## Task 9: DB query for pending bookings awaiting GCal confirm

**Files:**
- Modify: `db/bookings.ts` (add `GCAL_SYNC_CUTOFF` + `listPendingBookingsWithGcalEvent`)

The cutoff gates the cron to only act on bookings created after this feature ships, so legacy pending events (which Google treats as confirmed) are never auto-confirmed.

- [ ] **Step 1: Add the cutoff constant** near the top of `db/bookings.ts` (after imports):

```ts
/**
 * Bookings created before this date predate the tentative-on-create
 * behaviour; their GCal events default to "confirmed" in Google, so the
 * confirm-sync cron must ignore them to avoid mass auto-confirmation.
 * Set to the feature ship date.
 */
export const GCAL_SYNC_CUTOFF = new Date("2026-05-30T00:00:00Z");
```

- [ ] **Step 2: Add the query** (place near `listBookingsDueForReminder`):

```ts
/**
 * Pending, future bookings that have a GCal event and were created on or
 * after GCAL_SYNC_CUTOFF. Backs the daily confirm-sync cron: it reads
 * each event and promotes the row to confirmed when the admin marked the
 * calendar event confirmed.
 */
export async function listPendingBookingsWithGcalEvent(
  cutoff: Date = GCAL_SYNC_CUTOFF,
): Promise<schema.Booking[]> {
  if (!db) return [];
  return db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "pending"),
        gte(schema.bookings.createdAt, cutoff),
        gte(schema.bookings.scheduledFor, new Date()),
        sql`${schema.bookings.gcalEventId} IS NOT NULL`,
      ),
    );
}
```

(`and`, `eq`, `gte`, `sql` are already imported at the top of the file.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add db/bookings.ts
git commit -m "feat(db/bookings): listPendingBookingsWithGcalEvent + ship-date cutoff"
```

---

## Task 10: Confirm-sync cron route

**Files:**
- Create: `app/api/cron/booking-gcal-sync/route.ts`
- Test: `app/api/cron/booking-gcal-sync/route.test.ts`

Mirror the auth + structure of [app/api/cron/booking-reminders/route.ts](../../../app/api/cron/booking-reminders/route.ts).

- [ ] **Step 1: Write failing tests** in `app/api/cron/booking-gcal-sync/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/bookings", () => ({
  listPendingBookingsWithGcalEvent: vi.fn(),
  setBookingStatus: vi.fn(),
}));
vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn(),
  updateLastRefresh: vi.fn(),
}));
vi.mock("@/shared/lib/google-calendar", () => ({
  getCalendarEvent: vi.fn(),
  refreshAccessToken: vi.fn(),
}));
vi.mock("@/shared/lib/notifications", () => ({
  dispatchNotification: vi.fn(),
}));

import { GET } from "./route";
import {
  listPendingBookingsWithGcalEvent,
  setBookingStatus,
} from "@/db/bookings";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  getCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";

const ORIGINAL_ENV = process.env;
beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...ORIGINAL_ENV, NODE_ENV: "development" };
});

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request("https://x/api/cron/booking-gcal-sync", { headers });
}

it("returns 401 in production without the cron secret", async () => {
  process.env = { ...ORIGINAL_ENV, NODE_ENV: "production", CRON_SECRET: "s" };
  const res = await GET(makeReq());
  expect(res.status).toBe(401);
});

it("confirms a booking whose event is confirmed", async () => {
  (listPendingBookingsWithGcalEvent as any).mockResolvedValue([
    {
      id: "bk_1",
      userId: "u_1",
      gcalEventId: "evt_1",
      scheduledFor: new Date("2026-06-01T10:00:00Z"),
    },
  ]);
  (getActiveGoogleToken as any).mockResolvedValue({
    userId: "admin",
    refreshToken: "r",
    calendarId: "primary",
  });
  (refreshAccessToken as any).mockResolvedValue({ accessToken: "tok" });
  (getCalendarEvent as any).mockResolvedValue({ status: "confirmed" });

  const res = await GET(makeReq());
  const json = await res.json();
  expect(setBookingStatus).toHaveBeenCalledWith("bk_1", "confirmed");
  expect(json.confirmed).toBe(1);
});

it("leaves a tentative event pending", async () => {
  (listPendingBookingsWithGcalEvent as any).mockResolvedValue([
    { id: "bk_1", userId: "u_1", gcalEventId: "evt_1", scheduledFor: new Date() },
  ]);
  (getActiveGoogleToken as any).mockResolvedValue({
    userId: "admin",
    refreshToken: "r",
    calendarId: "primary",
  });
  (refreshAccessToken as any).mockResolvedValue({ accessToken: "tok" });
  (getCalendarEvent as any).mockResolvedValue({ status: "tentative" });

  const res = await GET(makeReq());
  const json = await res.json();
  expect(setBookingStatus).not.toHaveBeenCalled();
  expect(json.confirmed).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run app/api/cron/booking-gcal-sync/route.test.ts`
Expected: FAIL — `./route` does not exist.

- [ ] **Step 3: Implement `app/api/cron/booking-gcal-sync/route.ts`:**

```ts
import { NextResponse } from "next/server";
import {
  listPendingBookingsWithGcalEvent,
  setBookingStatus,
} from "@/db/bookings";
import {
  getActiveGoogleToken,
  updateLastRefresh,
} from "@/db/google-tokens";
import {
  getCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import { dispatchNotification } from "@/shared/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

/**
 * Daily safety-net: for each recent pending booking with a GCal event,
 * read the event and promote the booking to confirmed when the admin
 * marked the calendar event confirmed. Idempotent (only flips pending →
 * confirmed); best-effort per row so one failure doesn't stop the rest.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const bookings = await listPendingBookingsWithGcalEvent();
  if (bookings.length === 0) {
    return NextResponse.json({ examined: 0, confirmed: 0 });
  }

  const token = await getActiveGoogleToken();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!token || !clientId || !clientSecret) {
    return NextResponse.json({
      examined: bookings.length,
      confirmed: 0,
      skipped: "no_gcal_token",
    });
  }

  let accessToken: string;
  try {
    ({ accessToken } = await refreshAccessToken({
      clientId,
      clientSecret,
      refreshToken: token.refreshToken,
    }));
    await updateLastRefresh(token.userId);
  } catch (err) {
    console.warn("[booking-gcal-sync] token refresh failed:", err);
    return NextResponse.json({
      examined: bookings.length,
      confirmed: 0,
      skipped: "token_refresh_failed",
    });
  }

  let confirmed = 0;
  for (const b of bookings) {
    if (!b.gcalEventId) continue;
    try {
      const evt = await getCalendarEvent({
        calendarId: token.calendarId,
        eventId: b.gcalEventId,
        accessToken,
      });
      if (evt?.status === "confirmed") {
        await setBookingStatus(b.id, "confirmed");
        confirmed += 1;
        await dispatchNotification(b.userId, "booking_confirmed", {
          titleKey: "category_booking_confirmed_push_title",
          bodyKey: "category_booking_confirmed_push_body",
          url: "/profile",
          meta: {
            bookingId: b.id,
            scheduledFor: b.scheduledFor.toISOString(),
          },
        });
      }
    } catch (err) {
      console.warn(
        `[booking-gcal-sync] sync failed for booking ${b.id}:`,
        err,
      );
    }
  }

  return NextResponse.json({ examined: bookings.length, confirmed });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run app/api/cron/booking-gcal-sync/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/booking-gcal-sync/
git commit -m "feat(cron): daily GCal->DB booking confirm sync"
```

---

## Task 11: Register the cron in vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add a second cron entry** (run shortly after reminders):

```json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/booking-gcal-sync",
      "schedule": "30 8 * * *"
    }
  ]
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "require('./vercel.json').crons.length===2 ? console.log('ok') : process.exit(1)"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore(cron): schedule booking-gcal-sync daily"
```

---

## Task 12: Admin-panel confirm patches the GCal event

**Files:**
- Modify: `features/bookings-admin/api/actions.ts` (`confirmBooking`)

Keeps the two confirm paths in agreement: when the admin confirms in-app, the calendar event is promoted to `confirmed` too. Best-effort (mirrors `declineBooking`'s GCal-delete pattern).

- [ ] **Step 1: Extend `confirmBooking`.** After `await setBookingStatus(bookingId, "confirmed");`, before fetching the booking for notification (or reuse the fetched booking), add a best-effort event patch. Update imports first:

```ts
import { getBookingById, setBookingStatus } from "@/db/bookings";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  refreshAccessToken,
  setCalendarEventStatus,
} from "@/shared/lib/google-calendar";
```

Then in the body:

```ts
export async function confirmBooking(bookingId: string): Promise<void> {
  if (!(await requireAdmin())) return;
  await setBookingStatus(bookingId, "confirmed");

  const booking = await getBookingById(bookingId);

  if (booking?.gcalEventId) {
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
        await setCalendarEventStatus({
          calendarId: token.calendarId,
          eventId: booking.gcalEventId,
          accessToken,
          status: "confirmed",
        });
      }
    } catch (err) {
      console.warn(
        "[confirmBooking] GCal status patch failed; DB already confirmed:",
        err,
      );
    }
  }

  if (booking) {
    await dispatchNotification(booking.userId, "booking_confirmed", {
      titleKey: "category_booking_confirmed_push_title",
      bodyKey: "category_booking_confirmed_push_body",
      url: "/profile",
      meta: { bookingId, scheduledFor: booking.scheduledFor.toISOString() },
    });
  }
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint features/bookings-admin/api/actions.ts`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add features/bookings-admin/api/actions.ts
git commit -m "feat(admin): confirmBooking patches GCal event to confirmed"
```

---

## Task 13: Full verification (verification-before-completion)

Use the `superpowers:verification-before-completion` skill — run each command and report the actual output before claiming done.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Unit tests**

Run: `npm test`
Expected: all pass (846+ existing plus the new ones).

- [ ] **Step 3: Build (pre-push hook runs this anyway)**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Manual smoke (optional but recommended)** — use the `run` skill or `npm run dev`: open `/en/profile` as a user with a pending booking; confirm the badge shows "Pending"; confirm via admin; reload profile → "Confirmed". Verify a cancelled booking appears in history with the "Cancelled" badge and the "Book again" CTA.

- [ ] **Step 5: Open the PR** (use the `pr-description` skill) targeting `develop`.

---

## Notes for the implementer

- **i18n:** never hardcode status text in components — always `t("booking_status.<status>")`. The badge component itself takes `label` so it stays presentation-only.
- **Badge contrast:** keep pills dark/opaque (project rule: liquid-glass surfaces must be dark & opaque on the dark/cream theme, not light tints).
- **GCal calls are best-effort everywhere** — a Calendar outage must never break the customer flow or stop the cron processing remaining rows.
- **Cutoff:** if the actual deploy date differs from `2026-05-30`, update `GCAL_SYNC_CUTOFF` before shipping.
- **FSD imports:** import the badge via `@/shared/ui/booking-status-badge` (slice root), never the file directly.
