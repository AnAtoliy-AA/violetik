# Customer Profile Real Data + Testimonials — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock visits on `/[locale]/profile` with real bookings, add self-cancel (>24h gate) with a Telegram contact fallback, and ship a moderated public-testimonial submit/list surface for the signed-in customer.

**Architecture:** Three new DB pieces (`testimonials` table, `masters.telegram_username`, `site_settings.telegram_username`); one thin `entities/booking` slice for pure helpers (`canSelfCancel`, `bucketBookings`, plus a `UserBookingRow` type); two new feature slices (`features/booking-cancel`, `features/testimonial-submit`); two existing admin forms get one Telegram-username field each; the profile view is rewired to read real data and compose the new features. PR targets `develop`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Drizzle (Postgres), Vitest + RTL, Storybook, Playwright, Tailwind v4, next-intl, next-themes, Auth.js v5 (Telegram + Google providers).

**Spec:** [docs/superpowers/specs/2026-05-23-profile-real-data-and-testimonials-design.md](../specs/2026-05-23-profile-real-data-and-testimonials-design.md)

---

## House conventions to follow

- **TDD:** Red → Green → Commit per task. Don't batch. Use `superpowers:test-driven-development` if uncertain.
- **DB helpers** all start with `if (!db) return null;` / `if (!db) return [];` (graceful DB-disabled fallback). See [db/bookings.ts](../../../db/bookings.ts).
- **Missing-table tolerance:** for SELECTs, wrap in try/catch and check for Postgres SQLSTATE `42P01` via `isMissingTable(error)` like [db/masters.ts:11-20](../../../db/masters.ts#L11-L20). Not needed for INSERTs (the migration is required before insert paths execute).
- **Id helpers** mirror [db/bookings.ts:24](../../../db/bookings.ts#L24) and [db/vip-requests.ts:5](../../../db/vip-requests.ts#L5) — `randomBytes(8).toString("hex")` with a typed prefix.
- **Server actions** start with `"use server"`, call `getCurrentSessionUser()` from [shared/lib/auth-server.ts:17](../../../shared/lib/auth-server.ts#L17), and end with `revalidatePath("/", "layout")`. See [features/services-admin/api/create-service.ts](../../../features/services-admin/api/create-service.ts) for the canonical shape.
- **FSD imports:** import features through their slice root (`@/features/booking-cancel`), never deep paths. Tests within a slice may use relative imports.
- **Commits:** Conventional Commits (`feat(profile-cancel): …`, `test(testimonials): …`, etc.). Pre-commit hook runs `npm run lint && npm test`; pre-push runs `npm run build`. Don't bypass.
- **i18n triples** — every new user-visible string lives in [messages/en.json](../../../messages/en.json), [messages/ru.json](../../../messages/ru.json), [messages/be.json](../../../messages/be.json). EN is authoritative; RU is polite (Вы-form); BE matches existing tone (informal ты-equivalent).
- **Storybook for every new UI component:** stories at `*.stories.tsx` next to the component (the project's Storybook-vitest project tests stories as smoke tests). See [shared/ui/button/button.stories.tsx](../../../shared/ui/button/button.stories.tsx) for the minimal template.

---

## Task 0: Confirm green baseline

**Files:** none — just sanity.

- [ ] **Step 1: Verify branch + clean tree**

Run:
```bash
git status --short
git log -1 --oneline
git rev-parse --abbrev-ref HEAD
```
Expected:
- Working tree clean (or only `.playwright-mcp/` untracked, fine).
- HEAD on a `docs(spec): …` commit; branch `feature/profile-real-data-and-testimonials`.

- [ ] **Step 2: Verify suite is green before touching anything**

Run:
```bash
npm run lint && npm test
```
Expected: both exit 0; ~521 tests pass.

If anything fails here, stop and surface — the failure is pre-existing, not yours.

---

## Task 1: Schema changes (`masters.telegram_username`, `site_settings.telegram_username`, `testimonials` table)

**Files:**
- Modify: [db/schema.ts](../../../db/schema.ts) — add two nullable text columns and the new `testimonials` table + enum.
- Create: `db/migrations/0012_profile_testimonials_and_telegram.sql` (drizzle-kit generates the name; the exact suffix is `_profile_testimonials_and_telegram` only if drizzle picks it — accept whatever drizzle outputs).
- Create: `db/migrations/meta/0012_snapshot.json` (drizzle generates).

- [ ] **Step 1: Write schema additions**

Edit [db/schema.ts](../../../db/schema.ts):

1. In the `masters` pgTable, add after `setsLabel`:
```ts
  telegramUsername: text("telegram_username"),
```

2. In the `siteSettings` pgTable, add right before `updatedAt`:
```ts
    telegramUsername: text("telegram_username"),
```

3. At the end of the file, before the `export type` block, add:
```ts
export const testimonialStatus = pgEnum("testimonial_status", [
  "pending",
  "approved",
  "rejected",
]);

export const testimonials = pgTable(
  "testimonials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    masterId: text("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: testimonialStatus("status").notNull().default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("testimonials_user_idx").on(table.userId),
    masterIdx: index("testimonials_master_idx").on(table.masterId),
    statusIdx: index("testimonials_status_idx").on(table.status),
    onePendingPerPair: uniqueIndex("testimonials_one_pending_per_pair")
      .on(table.userId, table.masterId)
      .where(sql`status = 'pending'`),
  }),
);
```

4. At the very end of the file, append:
```ts
export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
export type TestimonialStatus = (typeof testimonialStatus.enumValues)[number];
```

- [ ] **Step 2: Generate the migration**

Run:
```bash
npm run db:generate
```
Expected: drizzle-kit prints `Your SQL migration file ➜ db/migrations/0012_*.sql 🚀` and writes `db/migrations/meta/0012_snapshot.json`. Open the generated SQL and skim — it should contain three statements (two ALTER TABLE … ADD COLUMN … for the new nullable columns, and a CREATE TYPE + CREATE TABLE + 3 CREATE INDEX + 1 CREATE UNIQUE INDEX for testimonials). **No DROPs.** If you see a DROP, stop and surface it.

- [ ] **Step 3: Verify schema typechecks**

Run:
```bash
npx tsc --noEmit
```
Expected: exit 0. (No new code consumes the schema yet — this just confirms the additions parse.)

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/0012_*.sql db/migrations/meta/0012_snapshot.json
git commit -m "feat(db): testimonials table + masters/site_settings telegram_username"
```
The pre-commit hook runs lint + the full vitest suite — both should pass (no behavioral code yet).

---

## Task 2: `db/testimonials.ts` — readers and writer

**Files:**
- Create: `db/testimonials.ts`
- Create: `db/testimonials.test.ts`

The shape mirrors [db/vip-requests.ts](../../../db/vip-requests.ts). DB tests in this repo use a real DB connection when `DATABASE_URL` is set; when it's not, helpers return null/empty and tests assert that null-safe path. See [db/users.test.ts](../../../db/users.test.ts) for the no-DB-test pattern.

- [ ] **Step 1: Write the failing test**

Create `db/testimonials.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  createTestimonial,
  listUserTestimonials,
  generateTestimonialId,
} from "./testimonials";

describe("generateTestimonialId", () => {
  it("produces a tst_ prefix and 16 hex chars", () => {
    const id = generateTestimonialId();
    expect(id).toMatch(/^tst_[0-9a-f]{16}$/);
  });
  it("produces unique ids across calls", () => {
    const a = generateTestimonialId();
    const b = generateTestimonialId();
    expect(a).not.toBe(b);
  });
});

describe("createTestimonial (no DB)", () => {
  it("returns null when DATABASE_URL is unset", async () => {
    if (process.env.DATABASE_URL) return; // skip when DB is configured
    const row = await createTestimonial({
      userId: "tg:1",
      masterId: "m1",
      body: "Hello",
    });
    expect(row).toBeNull();
  });
});

describe("listUserTestimonials (no DB)", () => {
  it("returns an empty array when DATABASE_URL is unset", async () => {
    if (process.env.DATABASE_URL) return;
    const rows = await listUserTestimonials("tg:1");
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run db/testimonials.test.ts
```
Expected: FAIL — `Cannot find module './testimonials'`.

- [ ] **Step 3: Write minimal implementation**

Create `db/testimonials.ts`:
```ts
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "./index";

export function generateTestimonialId(): string {
  return `tst_${randomBytes(8).toString("hex")}`;
}

export interface NewTestimonialInput {
  userId: string;
  masterId: string;
  body: string;
}

export type CreateTestimonialResult =
  | { ok: true; row: schema.Testimonial }
  | { ok: false; reason: "duplicate_pending" };

function isMissingTable(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if ("code" in cur && (cur as { code: unknown }).code === "42P01") {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

function isUniqueViolation(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if ("code" in cur && (cur as { code: unknown }).code === "23505") {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Inserts a pending testimonial. Returns null if DB isn't configured.
 * Returns `{ ok: false, reason: 'duplicate_pending' }` when the
 * partial unique index `testimonials_one_pending_per_pair` blocks the
 * insert because another pending row already exists for the same
 * (user, master).
 */
export async function createTestimonial(
  input: NewTestimonialInput,
): Promise<CreateTestimonialResult | null> {
  if (!db) return null;
  const id = generateTestimonialId();
  try {
    const rows = await db
      .insert(schema.testimonials)
      .values({
        id,
        userId: input.userId,
        masterId: input.masterId,
        body: input.body,
      })
      .returning();
    if (!rows[0]) return null;
    return { ok: true, row: rows[0] };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "duplicate_pending" };
    }
    throw error;
  }
}

export async function listUserTestimonials(
  userId: string,
): Promise<schema.Testimonial[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.testimonials)
      .where(eq(schema.testimonials.userId, userId))
      .orderBy(desc(schema.testimonials.createdAt));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run db/testimonials.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add db/testimonials.ts db/testimonials.test.ts
git commit -m "feat(db/testimonials): create + list helpers with duplicate-pending mapping"
```

---

## Task 3: `db/bookings.ts` — `listUserBookings` + race-safe `cancelBookingIfOpen`

**Files:**
- Modify: [db/bookings.ts](../../../db/bookings.ts) — add `listUserBookings` (joins masters) and `cancelBookingIfOpen` (status-conditional update).
- Modify: `db/bookings.test.ts` (extend; create the file if it doesn't exist).

Don't change `setBookingStatus` — the admin decline flow uses it and we keep their flow untouched. The customer-side cancel path uses the new `cancelBookingIfOpen` instead.

- [ ] **Step 1: Write the failing tests (no-DB branch)**

Append to `db/bookings.test.ts` (create if absent — copy the test file header pattern from `db/users.test.ts`):
```ts
import { describe, expect, it } from "vitest";
import { listUserBookings, cancelBookingIfOpen } from "./bookings";

describe("listUserBookings (no DB)", () => {
  it("returns an empty array when DATABASE_URL is unset", async () => {
    if (process.env.DATABASE_URL) return;
    const rows = await listUserBookings("tg:1");
    expect(rows).toEqual([]);
  });
});

describe("cancelBookingIfOpen (no DB)", () => {
  it("returns null when DATABASE_URL is unset", async () => {
    if (process.env.DATABASE_URL) return;
    const out = await cancelBookingIfOpen("bk_doesnotmatter");
    expect(out).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run db/bookings.test.ts
```
Expected: FAIL — `listUserBookings is not exported` (or similar).

- [ ] **Step 3: Implement the new functions**

In [db/bookings.ts](../../../db/bookings.ts), add new imports:
```ts
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
```
(Replace the existing imports line — keep what's already imported, add `asc` and `sql`.)

Append the new interface and helpers at the end of the file:
```ts
export interface UserBookingRow extends schema.Booking {
  masterNameEn: string | null;
  masterNameRu: string | null;
  masterNameBe: string | null;
  masterTelegramUsername: string | null;
}

/**
 * Bookings for one user, excluding cancelled rows. Sorted ascending
 * by scheduledFor; the view buckets into upcoming / history using a
 * single `now` captured server-side.
 */
export async function listUserBookings(
  userId: string,
): Promise<UserBookingRow[]> {
  if (!db) return [];
  const rows = await db
    .select({
      booking: schema.bookings,
      masterNameEn: schema.masters.nameEn,
      masterNameRu: schema.masters.nameRu,
      masterNameBe: schema.masters.nameBe,
      masterTelegramUsername: schema.masters.telegramUsername,
    })
    .from(schema.bookings)
    .leftJoin(schema.masters, eq(schema.bookings.masterId, schema.masters.id))
    .where(
      and(
        eq(schema.bookings.userId, userId),
        ne(schema.bookings.status, "cancelled"),
      ),
    )
    .orderBy(asc(schema.bookings.scheduledFor));
  return rows.map((r) => ({
    ...r.booking,
    masterNameEn: r.masterNameEn,
    masterNameRu: r.masterNameRu,
    masterNameBe: r.masterNameBe,
    masterTelegramUsername: r.masterTelegramUsername,
  }));
}

/**
 * Race-safe customer cancel: only flips the row when its current
 * status is pending or confirmed. Returns the updated row when the
 * update happened, or null when nothing was updated (already cancelled
 * / completed / no such row / DB disabled).
 */
export async function cancelBookingIfOpen(
  id: string,
): Promise<schema.Booking | null> {
  if (!db) return null;
  const rows = await db
    .update(schema.bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(schema.bookings.id, id),
        sql`${schema.bookings.status} IN ('pending','confirmed')`,
      ),
    )
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run db/bookings.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/bookings.ts db/bookings.test.ts
git commit -m "feat(db/bookings): listUserBookings + race-safe cancelBookingIfOpen"
```

---

## Task 4: `entities/booking` slice — `canSelfCancel` (pure)

**Files:**
- Create: `entities/booking/index.ts`
- Create: `entities/booking/lib/can-self-cancel.ts`
- Create: `entities/booking/lib/can-self-cancel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `entities/booking/lib/can-self-cancel.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { canSelfCancel } from "./can-self-cancel";

const HOUR = 60 * 60 * 1000;

describe("canSelfCancel", () => {
  const now = new Date("2026-05-23T12:00:00Z");

  it("returns true when scheduledFor is 24h + 1 minute away", () => {
    const scheduled = new Date(now.getTime() + 24 * HOUR + 60_000);
    expect(canSelfCancel(now, scheduled)).toBe(true);
  });

  it("returns false at exactly 24h", () => {
    const scheduled = new Date(now.getTime() + 24 * HOUR);
    expect(canSelfCancel(now, scheduled)).toBe(false);
  });

  it("returns false at 24h - 1 minute", () => {
    const scheduled = new Date(now.getTime() + 24 * HOUR - 60_000);
    expect(canSelfCancel(now, scheduled)).toBe(false);
  });

  it("returns false for past times", () => {
    const scheduled = new Date(now.getTime() - HOUR);
    expect(canSelfCancel(now, scheduled)).toBe(false);
  });

  it("returns false when scheduledFor equals now", () => {
    expect(canSelfCancel(now, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run entities/booking/lib/can-self-cancel.test.ts
```
Expected: FAIL — `Cannot find module './can-self-cancel'`.

- [ ] **Step 3: Write minimal implementation**

Create `entities/booking/lib/can-self-cancel.ts`:
```ts
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * A customer can self-cancel only when the visit is strictly more
 * than 24 hours away. Exactly-24h is not enough — the customer must
 * contact the master directly below the threshold (see spec §3).
 */
export function canSelfCancel(now: Date, scheduledFor: Date): boolean {
  return scheduledFor.getTime() - now.getTime() > TWENTY_FOUR_HOURS_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run entities/booking/lib/can-self-cancel.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Create the slice index**

Create `entities/booking/index.ts`:
```ts
export { canSelfCancel } from "./lib/can-self-cancel";
```

- [ ] **Step 6: Commit**

```bash
git add entities/booking/
git commit -m "feat(entities/booking): canSelfCancel pure helper with strict >24h gate"
```

---

## Task 5: `entities/booking` — `bucketBookings` (pure)

**Files:**
- Create: `entities/booking/lib/bucket-bookings.ts`
- Create: `entities/booking/lib/bucket-bookings.test.ts`
- Create: `entities/booking/model/types.ts` (re-exports `UserBookingRow` from `db/bookings.ts` so the view can import it through the slice root).
- Modify: `entities/booking/index.ts`.

- [ ] **Step 1: Write the failing test**

Create `entities/booking/lib/bucket-bookings.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { bucketBookings } from "./bucket-bookings";
import type { UserBookingRow } from "@/db/bookings";

function row(
  overrides: Partial<UserBookingRow> & { id: string; scheduledFor: Date; status: UserBookingRow["status"] },
): UserBookingRow {
  return {
    id: overrides.id,
    userId: "tg:1",
    serviceId: "svc",
    masterId: null,
    scheduledFor: overrides.scheduledFor,
    durationMinutes: 60,
    status: overrides.status,
    gcalEventId: null,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    masterNameEn: null,
    masterNameRu: null,
    masterNameBe: null,
    masterTelegramUsername: null,
    ...overrides,
  } as UserBookingRow;
}

describe("bucketBookings", () => {
  const now = new Date("2026-05-23T12:00:00Z");

  it("puts future pending/confirmed into upcoming and past completed into history", () => {
    const rows = [
      row({ id: "a", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "pending" }),
      row({ id: "b", scheduledFor: new Date("2026-05-24T10:00:00Z"), status: "confirmed" }),
      row({ id: "c", scheduledFor: new Date("2026-04-01T10:00:00Z"), status: "completed" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.upcoming.map((r) => r.id)).toEqual(["b", "a"]); // soonest-first
    expect(out.history.map((r) => r.id)).toEqual(["c"]);
  });

  it("excludes cancelled rows even if listUserBookings somehow returned them", () => {
    const rows = [
      row({ id: "x", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "cancelled" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.upcoming).toEqual([]);
    expect(out.history).toEqual([]);
  });

  it("treats a future completed row as history (defensive)", () => {
    const rows = [
      row({ id: "fc", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "completed" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.history.map((r) => r.id)).toEqual(["fc"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run entities/booking/lib/bucket-bookings.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `entities/booking/lib/bucket-bookings.ts`:
```ts
import type { UserBookingRow } from "@/db/bookings";

export interface BookingBuckets {
  upcoming: UserBookingRow[];
  history: UserBookingRow[];
}

/**
 * Partitions user bookings into "upcoming" and "history" for the
 * profile view. Upcoming = future, status pending or confirmed.
 * History = status completed. Cancelled rows are excluded from both
 * (the spec hides cancelled rows from the customer entirely).
 *
 * Upcoming is sorted ascending (soonest first); history is sorted
 * descending (most recent first).
 */
export function bucketBookings(
  rows: readonly UserBookingRow[],
  now: Date,
): BookingBuckets {
  const upcoming: UserBookingRow[] = [];
  const history: UserBookingRow[] = [];
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    if (row.status === "completed") {
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
  upcoming.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  history.sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());
  return { upcoming, history };
}
```

Create `entities/booking/model/types.ts`:
```ts
export type { UserBookingRow } from "@/db/bookings";
```

Update `entities/booking/index.ts`:
```ts
export { canSelfCancel } from "./lib/can-self-cancel";
export { bucketBookings } from "./lib/bucket-bookings";
export type { BookingBuckets } from "./lib/bucket-bookings";
export type { UserBookingRow } from "./model/types";
```

- [ ] **Step 4: Run tests to verify all pass**

Run:
```bash
npx vitest run entities/booking
```
Expected: PASS (8 tests across the slice).

- [ ] **Step 5: Commit**

```bash
git add entities/booking/
git commit -m "feat(entities/booking): bucketBookings + slice index"
```

---

## Task 6: `features/booking-cancel` — `cancelBookingAction`

**Files:**
- Create: `features/booking-cancel/index.ts`
- Create: `features/booking-cancel/api/cancel-booking-action.ts`
- Create: `features/booking-cancel/api/cancel-booking-action.test.ts`

The test mocks `getCurrentSessionUser`, `getBookingById`, `cancelBookingIfOpen`, and the GCal helpers via `vi.mock`. Reference the existing mocking pattern in [features/services-admin/api/*.test.ts](../../../features/services-admin/api/).

- [ ] **Step 1: Write the failing test**

Create `features/booking-cancel/api/cancel-booking-action.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/db/bookings", () => ({
  getBookingById: vi.fn(),
  cancelBookingIfOpen: vi.fn(),
}));
vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { cancelBookingAction } from "./cancel-booking-action";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getBookingById, cancelBookingIfOpen } from "@/db/bookings";

const mockGetSession = vi.mocked(getCurrentSessionUser);
const mockGetBooking = vi.mocked(getBookingById);
const mockCancelIfOpen = vi.mocked(cancelBookingIfOpen);

function aBooking(overrides: Partial<Parameters<typeof mockGetBooking.mockResolvedValue>[0]> = {}) {
  return {
    id: "bk_1",
    userId: "tg:1",
    serviceId: "svc",
    masterId: null,
    scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000),
    durationMinutes: 60,
    status: "confirmed" as const,
    gcalEventId: null,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("cancelBookingAction", () => {
  it("rejects unauthenticated callers", async () => {
    mockGetSession.mockResolvedValue(null);
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("returns not_found when the booking is missing", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(null);
    const out = await cancelBookingAction("bk_nope");
    expect(out).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects when the caller is not the booking owner", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ userId: "tg:other" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "not_owner" });
  });

  it("rejects when the booking is already cancelled", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ status: "cancelled" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "already_cancelled" });
  });

  it("rejects when the booking is already completed", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ status: "completed" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "already_cancelled" });
  });

  it("rejects with too_late inside the 24h window", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(
      aBooking({
        scheduledFor: new Date(Date.now() + 12 * 60 * 60 * 1000),
      }),
    );
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "too_late" });
  });

  it("succeeds for an open booking >24h away", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking());
    mockCancelIfOpen.mockResolvedValue(aBooking({ status: "cancelled" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: true });
    expect(mockCancelIfOpen).toHaveBeenCalledWith("bk_1");
  });

  it("returns already_cancelled when the conditional update affects zero rows (race)", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking());
    mockCancelIfOpen.mockResolvedValue(null);
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "already_cancelled" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run features/booking-cancel
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the action**

Create `features/booking-cancel/api/cancel-booking-action.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { canSelfCancel } from "@/entities/booking";
import {
  cancelBookingIfOpen,
  getBookingById,
} from "@/db/bookings";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getActiveGoogleToken } from "@/db/google-tokens";
import { deleteCalendarEvent, refreshAccessToken } from "@/shared/lib/google-calendar";

export type CancelBookingResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "not_found"
        | "not_owner"
        | "too_late"
        | "already_cancelled"
        | "unknown";
    };

export async function cancelBookingAction(
  bookingId: string,
): Promise<CancelBookingResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, reason: "not_found" };
    if (booking.userId !== user.id) return { ok: false, reason: "not_owner" };
    if (booking.status === "cancelled" || booking.status === "completed") {
      return { ok: false, reason: "already_cancelled" };
    }
    if (!canSelfCancel(new Date(), booking.scheduledFor)) {
      return { ok: false, reason: "too_late" };
    }

    const cancelled = await cancelBookingIfOpen(bookingId);
    if (!cancelled) {
      return { ok: false, reason: "already_cancelled" };
    }

    if (cancelled.gcalEventId) {
      // Best-effort GCal cleanup — verbatim from features/bookings-admin/api/actions.ts:32
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
          await deleteCalendarEvent({
            calendarId: token.calendarId,
            eventId: cancelled.gcalEventId,
            accessToken,
          });
        }
      } catch (err) {
        console.warn(
          "[cancelBookingAction] GCal delete failed; status flipped anyway:",
          err,
        );
      }
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[cancelBookingAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}
```

The imports above are verified against [features/bookings-admin/api/actions.ts:5-10](../../../features/bookings-admin/api/actions.ts#L5-L10): `getActiveGoogleToken` from `@/db/google-tokens`, and `deleteCalendarEvent` + `refreshAccessToken` from the `@/shared/lib/google-calendar` barrel. No dynamic imports needed.

- [ ] **Step 4: Create the slice index**

Create `features/booking-cancel/index.ts`:
```ts
export { cancelBookingAction } from "./api/cancel-booking-action";
export type { CancelBookingResult } from "./api/cancel-booking-action";
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npx vitest run features/booking-cancel
```
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add features/booking-cancel/
git commit -m "feat(booking-cancel): cancelBookingAction with auth/owner/24h gates"
```

---

## Task 7: `features/booking-cancel` — `CancelBookingButton` UI

**Files:**
- Create: `features/booking-cancel/ui/cancel-booking-button.tsx`
- Create: `features/booking-cancel/ui/cancel-booking-button.test.tsx`
- Create: `features/booking-cancel/ui/cancel-booking-button.stories.tsx`
- Modify: `features/booking-cancel/index.ts` (export the component).

Mirror the structure of an existing client-side action button — see [features/services-admin/ui/](../../../features/services-admin/ui/) for a `useTransition`-based pattern.

- [ ] **Step 1: Write the failing test**

Create `features/booking-cancel/ui/cancel-booking-button.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CancelBookingButton } from "./cancel-booking-button";

const messages = {
  Profile: {
    cancel_button: "Cancel visit",
    cancel_confirming: "Cancelling…",
    cancel_error: "Could not cancel — try again or contact the master.",
  },
};

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("CancelBookingButton", () => {
  it("renders the cancel label by default", () => {
    render(
      wrap(
        <CancelBookingButton bookingId="bk_1" action={vi.fn() as never} />,
      ),
    );
    expect(screen.getByRole("button", { name: /Cancel visit/i })).toBeVisible();
  });

  it("calls the action and surfaces an error from a non-ok response", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, reason: "too_late" });
    render(wrap(<CancelBookingButton bookingId="bk_1" action={action} />));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(action).toHaveBeenCalledWith("bk_1"));
    await waitFor(() =>
      expect(
        screen.getByText(/Could not cancel/i),
      ).toBeVisible(),
    );
  });

  it("disables itself while pending", async () => {
    let resolve!: (v: { ok: true }) => void;
    const action = vi.fn(
      () => new Promise<{ ok: true }>((r) => (resolve = r)),
    );
    render(wrap(<CancelBookingButton bookingId="bk_1" action={action} />));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("button")).toBeDisabled(),
    );
    resolve({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run features/booking-cancel/ui/cancel-booking-button.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `features/booking-cancel/ui/cancel-booking-button.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import type { CancelBookingResult } from "../api/cancel-booking-action";

export interface CancelBookingButtonProps {
  bookingId: string;
  action: (bookingId: string) => Promise<CancelBookingResult>;
  className?: string;
}

export function CancelBookingButton({
  bookingId,
  action,
  className,
}: CancelBookingButtonProps) {
  const t = useTranslations("Profile");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (!result.ok) {
        setError(t("cancel_error"));
      }
    });
  };

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(buttonClassName({ variant: "outline", size: "sm" }))}
      >
        {pending ? t("cancel_confirming") : t("cancel_button")}
      </button>
      {error ? (
        <p role="alert" className="text-[12px] text-text-3">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

If `buttonClassName` or the variant names don't exist with these exact arguments in [shared/ui/button](../../../shared/ui/button), inline a Tailwind class set instead — don't invent an unsupported variant.

- [ ] **Step 4: Create the Storybook story**

Create `features/booking-cancel/ui/cancel-booking-button.stories.tsx`:
```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CancelBookingButton } from "./cancel-booking-button";
import { NextIntlClientProvider } from "next-intl";

const messages = {
  Profile: {
    cancel_button: "Cancel visit",
    cancel_confirming: "Cancelling…",
    cancel_error: "Could not cancel — try again or contact the master.",
  },
};

const meta = {
  title: "Features/BookingCancel/CancelBookingButton",
  component: CancelBookingButton,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof CancelBookingButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    bookingId: "bk_demo",
    action: async () => ({ ok: true }),
  },
};

export const ErrorTooLate: Story = {
  args: {
    bookingId: "bk_demo",
    action: async () => ({ ok: false, reason: "too_late" }),
  },
};
```

- [ ] **Step 5: Run tests + Storybook story tests**

Run:
```bash
npx vitest run features/booking-cancel
```
Expected: PASS for the component + story-as-test.

- [ ] **Step 6: Update the slice index**

Append to `features/booking-cancel/index.ts`:
```ts
export { CancelBookingButton } from "./ui/cancel-booking-button";
```

- [ ] **Step 7: Commit**

```bash
git add features/booking-cancel/
git commit -m "feat(booking-cancel): CancelBookingButton + story"
```

---

## Task 8: `features/booking-cancel` — `ContactMasterLink`

**Files:**
- Create: `features/booking-cancel/ui/contact-master-link.tsx`
- Create: `features/booking-cancel/ui/contact-master-link.test.tsx`
- Create: `features/booking-cancel/ui/contact-master-link.stories.tsx`
- Modify: `features/booking-cancel/index.ts`.

Three states: master has a Telegram → master link; master has none, studio has one → studio link; neither → static text.

- [ ] **Step 1: Write the failing test**

Create `features/booking-cancel/ui/contact-master-link.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { ContactMasterLink } from "./contact-master-link";

const messages = {
  Profile: {
    contact_master_cta: "Contact {name} on Telegram",
    contact_studio_cta: "Contact the studio on Telegram",
    contact_offline_cta: "Please contact the studio.",
  },
};

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("ContactMasterLink", () => {
  it("renders a t.me link for the master when masterTelegram is set", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram="violetta"
          studioTelegram="studio"
        />,
      ),
    );
    const link = screen.getByRole("link", { name: /Contact Violetta on Telegram/i });
    expect(link).toHaveAttribute("href", "https://t.me/violetta");
  });

  it("falls back to the studio link when masterTelegram is null", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram={null}
          studioTelegram="studio"
        />,
      ),
    );
    const link = screen.getByRole("link", { name: /Contact the studio on Telegram/i });
    expect(link).toHaveAttribute("href", "https://t.me/studio");
  });

  it("renders static text when both telegram values are null", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram={null}
          studioTelegram={null}
        />,
      ),
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/Please contact the studio\./i)).toBeVisible();
  });

  it("strips a stray leading @ defensively", () => {
    render(
      wrap(
        <ContactMasterLink
          masterName="Violetta"
          masterTelegram="@violetta"
          studioTelegram={null}
        />,
      ),
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://t.me/violetta");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run features/booking-cancel/ui/contact-master-link.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write the component**

Create `features/booking-cancel/ui/contact-master-link.tsx`:
```tsx
import { useTranslations } from "next-intl";

export interface ContactMasterLinkProps {
  masterName: string;
  masterTelegram: string | null;
  studioTelegram: string | null;
  className?: string;
}

function normalizeUsername(raw: string): string {
  return raw.startsWith("@") ? raw.slice(1) : raw;
}

export function ContactMasterLink({
  masterName,
  masterTelegram,
  studioTelegram,
  className,
}: ContactMasterLinkProps) {
  const t = useTranslations("Profile");

  const username = masterTelegram ?? studioTelegram;
  if (!username) {
    return (
      <p className={className} role="note">
        {t("contact_offline_cta")}
      </p>
    );
  }

  const href = `https://t.me/${normalizeUsername(username)}`;
  const label = masterTelegram
    ? t("contact_master_cta", { name: masterName })
    : t("contact_studio_cta");

  return (
    <a
      href={href}
      rel="noreferrer noopener"
      target="_blank"
      className={className}
    >
      {label}
    </a>
  );
}
```

- [ ] **Step 4: Create the story**

Create `features/booking-cancel/ui/contact-master-link.stories.tsx`:
```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ContactMasterLink } from "./contact-master-link";

const messages = {
  Profile: {
    contact_master_cta: "Contact {name} on Telegram",
    contact_studio_cta: "Contact the studio on Telegram",
    contact_offline_cta: "Please contact the studio.",
  },
};

const meta = {
  title: "Features/BookingCancel/ContactMasterLink",
  component: ContactMasterLink,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof ContactMasterLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PerMaster: Story = {
  args: {
    masterName: "Violetta",
    masterTelegram: "violetta",
    studioTelegram: "studio",
  },
};
export const StudioFallback: Story = {
  args: {
    masterName: "Violetta",
    masterTelegram: null,
    studioTelegram: "studio",
  },
};
export const Offline: Story = {
  args: {
    masterName: "Violetta",
    masterTelegram: null,
    studioTelegram: null,
  },
};
```

- [ ] **Step 5: Run tests**

Run:
```bash
npx vitest run features/booking-cancel
```
Expected: PASS (cancel button + contact link, ~7 component tests).

- [ ] **Step 6: Update the slice index**

Append:
```ts
export { ContactMasterLink } from "./ui/contact-master-link";
```

- [ ] **Step 7: Commit**

```bash
git add features/booking-cancel/
git commit -m "feat(booking-cancel): ContactMasterLink with studio fallback + offline state"
```

---

## Task 9: `features/testimonial-submit` — `submitTestimonialAction`

**Files:**
- Create: `features/testimonial-submit/index.ts`
- Create: `features/testimonial-submit/api/submit-testimonial-action.ts`
- Create: `features/testimonial-submit/api/submit-testimonial-action.test.ts`

- [ ] **Step 1: Write the failing test**

Create `features/testimonial-submit/api/submit-testimonial-action.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/db/masters", () => ({
  getMasterById: vi.fn(),
}));
vi.mock("@/db/testimonials", () => ({
  createTestimonial: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { submitTestimonialAction } from "./submit-testimonial-action";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getMasterById } from "@/db/masters";
import { createTestimonial } from "@/db/testimonials";

const mockSession = vi.mocked(getCurrentSessionUser);
const mockGetMaster = vi.mocked(getMasterById);
const mockCreate = vi.mocked(createTestimonial);

beforeEach(() => vi.clearAllMocks());

describe("submitTestimonialAction", () => {
  it("rejects unauthenticated callers", async () => {
    mockSession.mockResolvedValue(null);
    const out = await submitTestimonialAction({ masterId: "m1", body: "hi" });
    expect(out).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("rejects an empty body", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    const out = await submitTestimonialAction({ masterId: "m1", body: "   " });
    expect(out).toEqual({ ok: false, reason: "body_required" });
  });

  it("rejects a body longer than 800 chars after trim", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    const out = await submitTestimonialAction({
      masterId: "m1",
      body: "a".repeat(801),
    });
    expect(out).toEqual({ ok: false, reason: "body_too_long" });
  });

  it("rejects when the master is missing", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue(null);
    const out = await submitTestimonialAction({ masterId: "x", body: "ok" });
    expect(out).toEqual({ ok: false, reason: "invalid_master" });
  });

  it("rejects when the master is not published", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "draft" } as never);
    const out = await submitTestimonialAction({ masterId: "m1", body: "ok" });
    expect(out).toEqual({ ok: false, reason: "invalid_master" });
  });

  it("maps duplicate_pending from createTestimonial", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "published" } as never);
    mockCreate.mockResolvedValue({ ok: false, reason: "duplicate_pending" });
    const out = await submitTestimonialAction({ masterId: "m1", body: "hi" });
    expect(out).toEqual({ ok: false, reason: "duplicate_pending" });
  });

  it("succeeds on a happy path", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "published" } as never);
    mockCreate.mockResolvedValue({
      ok: true,
      row: { id: "tst_abc", body: "hi" } as never,
    });
    const out = await submitTestimonialAction({ masterId: "m1", body: " hi " });
    expect(out).toEqual({ ok: true, id: "tst_abc" });
    expect(mockCreate).toHaveBeenCalledWith({
      userId: "tg:1",
      masterId: "m1",
      body: "hi",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run features/testimonial-submit
```
Expected: FAIL.

- [ ] **Step 3: Implement the action**

Create `features/testimonial-submit/api/submit-testimonial-action.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getMasterById } from "@/db/masters";
import { createTestimonial } from "@/db/testimonials";

const inputSchema = z.object({
  masterId: z.string().min(1),
  body: z.string(),
});

export type SubmitTestimonialResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "invalid_master"
        | "body_required"
        | "body_too_long"
        | "duplicate_pending"
        | "unknown";
    };

export async function submitTestimonialAction(
  rawInput: { masterId: string; body: string },
): Promise<SubmitTestimonialResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };

    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, reason: "invalid_master" };

    const body = parsed.data.body.trim();
    if (body.length === 0) return { ok: false, reason: "body_required" };
    if (body.length > 800) return { ok: false, reason: "body_too_long" };

    const master = await getMasterById(parsed.data.masterId);
    if (!master || master.status !== "published") {
      return { ok: false, reason: "invalid_master" };
    }

    const result = await createTestimonial({
      userId: user.id,
      masterId: parsed.data.masterId,
      body,
    });
    if (!result) {
      // DB not configured — surface as unknown
      return { ok: false, reason: "unknown" };
    }
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    revalidatePath("/", "layout");
    return { ok: true, id: result.row.id };
  } catch (err) {
    console.error("[submitTestimonialAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}
```

- [ ] **Step 4: Create slice index**

Create `features/testimonial-submit/index.ts`:
```ts
export { submitTestimonialAction } from "./api/submit-testimonial-action";
export type { SubmitTestimonialResult } from "./api/submit-testimonial-action";
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npx vitest run features/testimonial-submit
```
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add features/testimonial-submit/
git commit -m "feat(testimonial-submit): submitTestimonialAction with master/body gates"
```

---

## Task 10: `features/testimonial-submit` — `TestimonialForm` UI

**Files:**
- Create: `features/testimonial-submit/ui/testimonial-form.tsx`
- Create: `features/testimonial-submit/ui/testimonial-form.test.tsx`
- Create: `features/testimonial-submit/ui/testimonial-form.stories.tsx`
- Modify: `features/testimonial-submit/index.ts`.

- [ ] **Step 1: Write the failing test**

Create `features/testimonial-submit/ui/testimonial-form.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestimonialForm } from "./testimonial-form";

const messages = {
  Profile: {
    testimonial_form_master: "Master",
    testimonial_form_body: "Your testimonial",
    testimonial_form_submit: "Submit",
    testimonial_form_submitting: "Submitting…",
    testimonial_form_success: "Thank you — your testimonial is pending review.",
    testimonial_form_too_long: "Please keep it under 800 characters.",
    testimonial_form_required: "Please write a few words.",
    testimonial_form_duplicate:
      "You already have a testimonial pending for this master.",
    testimonial_form_invalid_master: "Please pick a master.",
  },
};

const masters = [
  { id: "m1", name: "Violetta" },
  { id: "m2", name: "Sasha" },
];

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("TestimonialForm", () => {
  it("calls the action with the picked master and trimmed body, then shows success", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, id: "tst_1" });
    render(wrap(<TestimonialForm masters={masters} action={action} />));
    fireEvent.change(screen.getByLabelText(/Master/i), { target: { value: "m2" } });
    fireEvent.change(screen.getByLabelText(/Your testimonial/i), {
      target: { value: "  great service!  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() =>
      expect(action).toHaveBeenCalledWith({
        masterId: "m2",
        body: "great service!",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Thank you/i)).toBeVisible(),
    );
  });

  it("surfaces a duplicate_pending error", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, reason: "duplicate_pending" });
    render(wrap(<TestimonialForm masters={masters} action={action} />));
    fireEvent.change(screen.getByLabelText(/Master/i), { target: { value: "m1" } });
    fireEvent.change(screen.getByLabelText(/Your testimonial/i), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/You already have a testimonial pending/i),
      ).toBeVisible(),
    );
  });

  it("client-blocks an empty body", async () => {
    const action = vi.fn();
    render(wrap(<TestimonialForm masters={masters} action={action} />));
    fireEvent.change(screen.getByLabelText(/Master/i), { target: { value: "m1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() =>
      expect(screen.getByText(/Please write a few words/i)).toBeVisible(),
    );
    expect(action).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run features/testimonial-submit/ui/testimonial-form.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write the component**

Create `features/testimonial-submit/ui/testimonial-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import type { SubmitTestimonialResult } from "../api/submit-testimonial-action";

export interface TestimonialFormMaster {
  id: string;
  name: string;
}

export interface TestimonialFormProps {
  masters: readonly TestimonialFormMaster[];
  action: (input: {
    masterId: string;
    body: string;
  }) => Promise<SubmitTestimonialResult>;
}

type Status =
  | { kind: "idle" }
  | { kind: "client_error"; messageKey: string }
  | { kind: "server_error"; reason: Exclude<SubmitTestimonialResult & { ok: false }, never>["reason"] }
  | { kind: "success" };

const MAX_BODY = 800;

export function TestimonialForm({ masters, action }: TestimonialFormProps) {
  const t = useTranslations("Profile");
  const [pending, startTransition] = useTransition();
  const [masterId, setMasterId] = useState<string>(masters[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!masterId) {
      setStatus({ kind: "client_error", messageKey: "testimonial_form_invalid_master" });
      return;
    }
    if (trimmed.length === 0) {
      setStatus({ kind: "client_error", messageKey: "testimonial_form_required" });
      return;
    }
    if (trimmed.length > MAX_BODY) {
      setStatus({ kind: "client_error", messageKey: "testimonial_form_too_long" });
      return;
    }
    startTransition(async () => {
      const result = await action({ masterId, body: trimmed });
      if (result.ok) {
        setStatus({ kind: "success" });
        setBody("");
      } else {
        setStatus({ kind: "server_error", reason: result.reason });
      }
    });
  };

  const errorMessage =
    status.kind === "client_error"
      ? t(status.messageKey as never)
      : status.kind === "server_error"
        ? serverErrorMessage(status.reason, t)
        : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[12px] text-text-2">
        <span>{t("testimonial_form_master")}</span>
        <select
          value={masterId}
          onChange={(e) => setMasterId(e.target.value)}
          className={cn("rounded-md border border-line bg-bg px-3 py-2 text-[14px]")}
        >
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-text-2">
        <span>{t("testimonial_form_body")}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_BODY + 50}
          className={cn(
            "min-h-[100px] resize-y rounded-md border border-line bg-bg px-3 py-2 text-[14px]",
          )}
        />
        <span className="self-end font-mono text-[10px] text-text-3">
          {body.trim().length} / {MAX_BODY}
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonClassName({ variant: "solid", size: "md" }))}
      >
        {pending ? t("testimonial_form_submitting") : t("testimonial_form_submit")}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-[12px] text-text-3">
          {errorMessage}
        </p>
      ) : null}
      {status.kind === "success" ? (
        <p role="status" className="text-[12px] text-accent">
          {t("testimonial_form_success")}
        </p>
      ) : null}
    </form>
  );
}

function serverErrorMessage(
  reason: Exclude<SubmitTestimonialResult & { ok: false }, never>["reason"],
  t: (key: string) => string,
): string {
  switch (reason) {
    case "body_required":
      return t("testimonial_form_required");
    case "body_too_long":
      return t("testimonial_form_too_long");
    case "duplicate_pending":
      return t("testimonial_form_duplicate");
    case "invalid_master":
      return t("testimonial_form_invalid_master");
    case "unauthenticated":
    case "unknown":
    default:
      return t("testimonial_form_required");
  }
}
```

The button variants are `solid | gold | outline | ghost` (verified in [shared/ui/button/ui/button.tsx:14](../../../shared/ui/button/ui/button.tsx#L14)); use `solid` for primary submit and `outline` for the cancel button in Task 7.

- [ ] **Step 4: Create the story**

Create `features/testimonial-submit/ui/testimonial-form.stories.tsx`:
```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { TestimonialForm } from "./testimonial-form";

const messages = {
  Profile: {
    testimonial_form_master: "Master",
    testimonial_form_body: "Your testimonial",
    testimonial_form_submit: "Submit",
    testimonial_form_submitting: "Submitting…",
    testimonial_form_success: "Thank you — your testimonial is pending review.",
    testimonial_form_too_long: "Please keep it under 800 characters.",
    testimonial_form_required: "Please write a few words.",
    testimonial_form_duplicate:
      "You already have a testimonial pending for this master.",
    testimonial_form_invalid_master: "Please pick a master.",
  },
};
const masters = [
  { id: "m1", name: "Violetta" },
  { id: "m2", name: "Sasha" },
];
const meta = {
  title: "Features/TestimonialSubmit/TestimonialForm",
  component: TestimonialForm,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof TestimonialForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { masters, action: async () => ({ ok: true, id: "tst_demo" }) },
};
export const Duplicate: Story = {
  args: {
    masters,
    action: async () => ({ ok: false, reason: "duplicate_pending" }),
  },
};
```

- [ ] **Step 5: Run tests**

Run:
```bash
npx vitest run features/testimonial-submit
```
Expected: PASS.

- [ ] **Step 6: Update slice index**

Append:
```ts
export { TestimonialForm } from "./ui/testimonial-form";
export type {
  TestimonialFormMaster,
  TestimonialFormProps,
} from "./ui/testimonial-form";
```

- [ ] **Step 7: Commit**

```bash
git add features/testimonial-submit/
git commit -m "feat(testimonial-submit): TestimonialForm + story"
```

---

## Task 11: `features/testimonial-submit` — `MyTestimonialsList` (server component)

**Files:**
- Create: `features/testimonial-submit/ui/my-testimonials-list.tsx`
- Create: `features/testimonial-submit/ui/my-testimonials-list.test.tsx`
- Modify: `features/testimonial-submit/index.ts`.

This is a pure presentational server component — it takes already-loaded rows + a master-name lookup and renders them. The view calls `listUserTestimonials(userId)` and passes rows in.

- [ ] **Step 1: Write the failing test**

Create `features/testimonial-submit/ui/my-testimonials-list.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { MyTestimonialsList } from "./my-testimonials-list";

const messages = {
  Profile: {
    testimonials_empty: "Share a few words about a master.",
    status_pending: "Pending review",
    status_approved: "Published",
    status_rejected: "Not published",
  },
};
function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

const baseRow = {
  id: "tst_1",
  userId: "tg:1",
  masterId: "m1",
  body: "She is wonderful.",
  decidedAt: null,
  decidedBy: null,
  createdAt: new Date("2026-05-20T10:00:00Z"),
  updatedAt: new Date("2026-05-20T10:00:00Z"),
};

describe("MyTestimonialsList", () => {
  it("shows the empty state when there are no rows", () => {
    render(
      wrap(<MyTestimonialsList rows={[]} masterNameById={{ m1: "Violetta" }} />),
    );
    expect(screen.getByText(/Share a few words about a master/i)).toBeVisible();
  });

  it("renders each status with the right pill copy", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[
            { ...baseRow, id: "a", status: "pending" },
            { ...baseRow, id: "b", status: "approved" },
            { ...baseRow, id: "c", status: "rejected" },
          ]}
          masterNameById={{ m1: "Violetta" }}
        />,
      ),
    );
    expect(screen.getByText("Pending review")).toBeVisible();
    expect(screen.getByText("Published")).toBeVisible();
    expect(screen.getByText("Not published")).toBeVisible();
  });

  it("shows '(unknown master)' if the lookup map is missing the master", () => {
    render(
      wrap(
        <MyTestimonialsList
          rows={[{ ...baseRow, status: "pending" }]}
          masterNameById={{}}
        />,
      ),
    );
    expect(screen.getByText(/unknown master/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run features/testimonial-submit/ui/my-testimonials-list.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write the component**

Create `features/testimonial-submit/ui/my-testimonials-list.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import type { Testimonial, TestimonialStatus } from "@/db/schema";

export interface MyTestimonialsListProps {
  rows: readonly Testimonial[];
  masterNameById: Record<string, string>;
}

export async function MyTestimonialsList({
  rows,
  masterNameById,
}: MyTestimonialsListProps) {
  const t = await getTranslations("Profile");

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-text-3">{t("testimonials_empty")}</p>
    );
  }

  const statusLabel = (s: TestimonialStatus): string =>
    s === "pending"
      ? t("status_pending")
      : s === "approved"
        ? t("status_approved")
        : t("status_rejected");

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-[18px] border-[0.5px] border-line px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[16px] italic">
              {masterNameById[r.masterId] ?? "(unknown master)"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
              {statusLabel(r.status)}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] text-text-2">
            {r.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
npx vitest run features/testimonial-submit
```
Expected: PASS.

- [ ] **Step 5: Update slice index**

Append:
```ts
export { MyTestimonialsList } from "./ui/my-testimonials-list";
```

- [ ] **Step 6: Commit**

```bash
git add features/testimonial-submit/
git commit -m "feat(testimonial-submit): MyTestimonialsList server component"
```

---

## Task 12: Admin form — `masters_admin` Telegram username field

**Files:**
- Modify: [features/masters-admin/ui/master-editor.tsx](../../../features/masters-admin/ui/master-editor.tsx) (add input + state).
- Modify: [entities/master/model/schema.ts](../../../entities/master/model/schema.ts) (Zod) — verify path exists; otherwise extend the schema where it's defined.
- Modify: [features/masters-admin/api/save-master.ts](../../../features/masters-admin/api/save-master.ts) (or whatever filename owns the save action — `grep -l 'masters' features/masters-admin/api/`).
- Modify: [entities/master/model/types.ts](../../../entities/master/model/types.ts) — add optional `telegramUsername: string | null`.
- Modify: `features/masters-admin/ui/master-editor.test.tsx` — add a case for the new field.

The exact module names may differ slightly — `grep` to confirm before editing.

- [ ] **Step 1: Locate the master form's schema + save path**

Run:
```bash
grep -rn 'masterFormSchema\|masters_admin\|updateMasterAction' features/masters-admin/ entities/master/
```
Note the file that defines `masterFormSchema` and the action that consumes the patch.

- [ ] **Step 2: Add Zod validation for `telegramUsername`**

In the schema file (likely `entities/master/model/schema.ts`):
```ts
const TELEGRAM_USERNAME = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{4,31}$/u, "invalid_telegram_username")
  .nullable();

// Inside masterFormSchema:
telegramUsername: TELEGRAM_USERNAME.optional().default(null),
```
Adjust to whatever schema-building style the file uses. If the schema uses `.transform(...)` to coerce empty string to null, follow that pattern.

- [ ] **Step 3: Extend `MasterEditorInitial` + form state**

In [features/masters-admin/ui/master-editor.tsx](../../../features/masters-admin/ui/master-editor.tsx):
- Add `telegramUsername: string | null;` to `MasterEditorInitial`.
- Add a `useState` mirroring it.
- Add an input field below the existing role/bio inputs:
```tsx
<label className="flex flex-col gap-1 text-[12px] text-text-2">
  <span>Telegram username</span>
  <input
    type="text"
    value={telegramUsername ?? ""}
    onChange={(e) => setTelegramUsername(e.target.value || null)}
    placeholder="violetta"
    className={inputClass}
  />
  {validation.kind === "validation" && validation.issues.telegramUsername ? (
    <span className="text-[12px] text-accent">
      {validation.issues.telegramUsername}
    </span>
  ) : null}
</label>
```
- Include `telegramUsername` in the patch sent to `onSubmit`.

- [ ] **Step 4: Wire it through the save action + DB write**

Locate the save-master action (`grep -l save-master features/masters-admin/api/`). Add `telegramUsername` to:
- The action's input contract (mirror existing fields).
- The DB write in [db/masters-mutations.ts](../../../db/masters-mutations.ts) — `grep -nE 'telegramUsername\|nameEn' db/masters-mutations.ts` for the right insertion point.

If `db/masters-mutations.ts` doesn't already have an `updateMaster` style helper that takes a structured patch, the existing one will need the new column added to its `.set({ ... })` call.

- [ ] **Step 5: Add a Zod-rejection test**

Append to `features/masters-admin/ui/master-editor.test.tsx`:
```tsx
it("rejects an invalid Telegram username", async () => {
  const onSubmit = vi.fn();
  render(
    wrap(
      <MasterEditor
        mode="edit"
        initial={{ ...validInitial, telegramUsername: null }}
        services={[]}
        onSubmit={onSubmit}
      />,
    ),
  );
  fireEvent.change(screen.getByLabelText(/Telegram username/i), {
    target: { value: "no" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() =>
    expect(screen.getByText(/invalid_telegram_username/i)).toBeVisible(),
  );
  expect(onSubmit).not.toHaveBeenCalled();
});
```
(Reuse whatever the existing happy-path test's `validInitial` is — read the file first.)

- [ ] **Step 6: Run all masters-admin tests**

Run:
```bash
npx vitest run features/masters-admin entities/master db/masters
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add features/masters-admin/ entities/master/ db/masters-mutations.ts
git commit -m "feat(masters-admin): telegram username field with Zod validation"
```

---

## Task 13: Admin form — `studio-admin` Telegram username field

**Files:**
- Modify: [features/studio-admin/ui/studio-form.tsx](../../../features/studio-admin/ui/studio-form.tsx) — add input.
- Modify: [features/studio-admin/api/update-studio-action.ts](../../../features/studio-admin/api/update-studio-action.ts) (or equivalent — grep to confirm) — accept the new field.
- Modify: the studio-settings Zod schema — same regex as the masters one.
- Modify: [db/site-settings.ts](../../../db/site-settings.ts) — write the new column.
- Modify: `features/studio-admin/ui/studio-form.test.tsx`.

Symmetric to Task 12.

- [ ] **Step 1: Locate the studio form's schema + save path**

Run:
```bash
grep -rn 'studioFormSchema\|studio_admin' features/studio-admin/ entities/site-settings/ db/site-settings.ts
```

- [ ] **Step 2: Extend the Zod schema with `telegramUsername`** (same regex as Task 12).

- [ ] **Step 3: Update `SiteSettings` type + `DEFAULT_SITE_SETTINGS` in [entities/site-settings/model/types.ts:34](../../../entities/site-settings/model/types.ts#L34)**

Add `telegramUsername: string | null` to the `SiteSettings` interface. Add `telegramUsername: null,` to the `DEFAULT_SITE_SETTINGS` object. **This step is load-bearing** — both [features/studio-admin/ui/studio-form.test.tsx](../../../features/studio-admin/ui/studio-form.test.tsx) and [features/studio-admin/ui/studio-form.stories.tsx](../../../features/studio-admin/ui/studio-form.stories.tsx) spread `DEFAULT_SITE_SETTINGS`, so omitting this will break unrelated tests.

- [ ] **Step 4: Add the input + state to the form** (mirror Task 12's input snippet).

- [ ] **Step 5: Wire the action + `db/site-settings.ts` update path** to include `telegramUsername` in the patch.

- [ ] **Step 6: Add a rejection test to `studio-form.test.tsx`** (mirror Task 12's test).

- [ ] **Step 7: Run studio-admin tests**

Run:
```bash
npx vitest run features/studio-admin entities/site-settings db/site-settings
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add features/studio-admin/ entities/site-settings/ db/site-settings.ts
git commit -m "feat(studio-admin): site-wide telegram username field"
```

---

## Task 14: New i18n keys (en/ru/be)

**Files:**
- Modify: [messages/en.json](../../../messages/en.json)
- Modify: [messages/ru.json](../../../messages/ru.json)
- Modify: [messages/be.json](../../../messages/be.json)

- [ ] **Step 1: Add EN keys**

In `messages/en.json`, extend the `"Profile"` object (preserve existing keys):
```json
{
  "upcoming_eyebrow": "Upcoming",
  "upcoming_empty": "No upcoming visits.",
  "cancel_button": "Cancel visit",
  "cancel_confirming": "Cancelling…",
  "cancel_error": "Could not cancel — try again or contact the master.",
  "contact_master_cta": "Contact {name} on Telegram",
  "contact_studio_cta": "Contact the studio on Telegram",
  "contact_offline_cta": "Please contact the studio.",
  "with_master": "with {name}",
  "history_empty": "No past visits yet.",
  "testimonials_eyebrow": "Testimonials",
  "testimonials_empty": "Share a few words about a master.",
  "testimonial_form_master": "Master",
  "testimonial_form_body": "Your testimonial",
  "testimonial_form_submit": "Submit",
  "testimonial_form_submitting": "Submitting…",
  "testimonial_form_success": "Thank you — your testimonial is pending review.",
  "testimonial_form_too_long": "Please keep it under 800 characters.",
  "testimonial_form_required": "Please write a few words.",
  "testimonial_form_duplicate": "You already have a testimonial pending for this master.",
  "testimonial_form_invalid_master": "Please pick a master.",
  "status_pending": "Pending review",
  "status_approved": "Published",
  "status_rejected": "Not published"
}
```

- [ ] **Step 2: Add RU keys** (polite Вы-form, matching the existing file's tone):
```json
{
  "upcoming_eyebrow": "Предстоящие",
  "upcoming_empty": "Нет предстоящих визитов.",
  "cancel_button": "Отменить визит",
  "cancel_confirming": "Отменяю…",
  "cancel_error": "Не удалось отменить — попробуйте ещё раз или свяжитесь с мастером.",
  "contact_master_cta": "Написать {name} в Telegram",
  "contact_studio_cta": "Написать ателье в Telegram",
  "contact_offline_cta": "Свяжитесь, пожалуйста, с ателье.",
  "with_master": "с {name}",
  "history_empty": "Пока нет прошлых визитов.",
  "testimonials_eyebrow": "Отзывы",
  "testimonials_empty": "Поделитесь впечатлениями о мастере.",
  "testimonial_form_master": "Мастер",
  "testimonial_form_body": "Ваш отзыв",
  "testimonial_form_submit": "Отправить",
  "testimonial_form_submitting": "Отправляю…",
  "testimonial_form_success": "Спасибо — отзыв ожидает модерации.",
  "testimonial_form_too_long": "Пожалуйста, не более 800 символов.",
  "testimonial_form_required": "Напишите, пожалуйста, несколько слов.",
  "testimonial_form_duplicate": "У вас уже есть отзыв на модерации для этого мастера.",
  "testimonial_form_invalid_master": "Выберите мастера.",
  "status_pending": "На модерации",
  "status_approved": "Опубликовано",
  "status_rejected": "Не опубликовано"
}
```

- [ ] **Step 3: Add BE keys** (match existing file's informal tone):
```json
{
  "upcoming_eyebrow": "Запланавана",
  "upcoming_empty": "Няма запланаваных візітаў.",
  "cancel_button": "Адмяніць візіт",
  "cancel_confirming": "Адмяняю…",
  "cancel_error": "Не атрымалася адмяніць — паспрабуй яшчэ ці звяжыся з майстрам.",
  "contact_master_cta": "Напісаць {name} ў Telegram",
  "contact_studio_cta": "Напісаць атэлье ў Telegram",
  "contact_offline_cta": "Звяжыся, калі ласка, з атэлье.",
  "with_master": "з {name}",
  "history_empty": "Пакуль няма мінулых візітаў.",
  "testimonials_eyebrow": "Водгукі",
  "testimonials_empty": "Падзяліся ўражаннямі пра майстра.",
  "testimonial_form_master": "Майстар",
  "testimonial_form_body": "Твой водгук",
  "testimonial_form_submit": "Адправіць",
  "testimonial_form_submitting": "Адпраўляю…",
  "testimonial_form_success": "Дзякуй — водгук чакае мадэрацыі.",
  "testimonial_form_too_long": "Калі ласка, не больш за 800 знакаў.",
  "testimonial_form_required": "Напішы, калі ласка, некалькі словаў.",
  "testimonial_form_duplicate": "У цябе ўжо ёсць водгук на мадэрацыі для гэтага майстра.",
  "testimonial_form_invalid_master": "Абяры майстра.",
  "status_pending": "На мадэрацыі",
  "status_approved": "Апублікавана",
  "status_rejected": "Не апублікавана"
}
```

- [ ] **Step 4: Verify JSON parses**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/ru.json','utf8'));JSON.parse(require('fs').readFileSync('messages/be.json','utf8')); console.log('ok')"
```
Expected: `ok`.

- [ ] **Step 5: Run tests** (component tests pick up the new keys via inline messages, but the suite must still pass):

Run:
```bash
npx vitest run
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add messages/
git commit -m "i18n(profile): cancel/contact/testimonial copy in en/ru/be"
```

---

## Task 15: Rewire `views/profile/ui/profile-page.tsx`

**Files:**
- Modify: [views/profile/ui/profile-page.tsx](../../../views/profile/ui/profile-page.tsx) — replace mock visits with real data, compose new features.
- Modify: [views/profile/ui/profile-page.test.tsx](../../../views/profile/ui/profile-page.test.tsx) — adapt assertions.
- Modify: [messages/en.json](../../../messages/en.json) → existing `Profile.joined` already says "Joined in {year}", keep it; the `next_visit_eyebrow` and `history_eyebrow` stay.

- [ ] **Step 1: Read the current file end-to-end**

Open [views/profile/ui/profile-page.tsx](../../../views/profile/ui/profile-page.tsx) — note that it already pulls `user` from `getCurrentSessionUser()` and `tier` from `getCurrentTier()`. The change is: replace `const { visits } = STUDIO_DATA;` and downstream usage with real data, redirect anonymous users, add the new sections.

- [ ] **Step 2: Write the new view (full rewrite of the body)**

Replace the file with this shape (keep existing imports for visual primitives like `Aurora`, `NailFan`, `SpotlightCard`, `PaperGrain`, `AppHeader`, `TabBar`, `LetterpressRule`, `Eyebrow`, `Link`):

```tsx
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadProfileWithPhoto } from "@/entities/studio/api/load-with-photos";
import { listAllServices } from "@/db/services";
import { listUserBookings } from "@/db/bookings";
import { listUserTestimonials } from "@/db/testimonials";
import { listPublishedMasters } from "@/db/masters";
import { getSiteSettings } from "@/db/site-settings";
import { bucketBookings, canSelfCancel } from "@/entities/booking";
import { CancelBookingButton, ContactMasterLink } from "@/features/booking-cancel";
import { cancelBookingAction } from "@/features/booking-cancel";
import {
  TestimonialForm,
  MyTestimonialsList,
  submitTestimonialAction,
} from "@/features/testimonial-submit";
import { Aurora } from "@/shared/ui/aurora";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailFan } from "@/shared/ui/nail-fan";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import type { UserBookingRow } from "@/entities/booking";

function formatDateTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
function formatTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}
function masterNameInLocale(
  row: UserBookingRow,
  locale: string,
): string | null {
  if (locale === "ru") return row.masterNameRu;
  if (locale === "be") return row.masterNameBe;
  return row.masterNameEn;
}

export async function ProfilePage({ locale }: { locale: string }) {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/profile`);
  }

  const [
    t,
    profile,
    services,
    bookings,
    testimonials,
    publishedMasters,
    settings,
    tier,
  ] = await Promise.all([
    getTranslations("Profile"),
    loadProfileWithPhoto(),
    listAllServices(),
    listUserBookings(user.id),
    listUserTestimonials(user.id),
    listPublishedMasters(),
    getSiteSettings(),
    getCurrentTier(user.id),
  ]);

  const now = new Date();
  const { upcoming, history } = bucketBookings(bookings, now);
  const next = upcoming[0];
  const otherUpcoming = upcoming.slice(1);
  const completedHistory = history.slice(0, 20);

  const serviceName = (id: string): string => {
    const s = services.find((row) => row.id === id);
    if (!s) return id;
    return locale === "ru" ? s.nameRu : locale === "be" ? s.nameBe : s.nameEn;
  };

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    profile.name;
  const joinedYear = user.createdAt
    ? new Date(user.createdAt).getUTCFullYear()
    : new Date().getUTCFullYear();

  const studioTelegram = settings.telegramUsername ?? null;

  const renderAction = (row: UserBookingRow) => {
    if (canSelfCancel(now, row.scheduledFor)) {
      return (
        <CancelBookingButton bookingId={row.id} action={cancelBookingAction} />
      );
    }
    return (
      <ContactMasterLink
        masterName={masterNameInLocale(row, locale) ?? t("with_master", { name: "" })}
        masterTelegram={row.masterTelegramUsername}
        studioTelegram={studioTelegram}
      />
    );
  };

  const masterNameById = Object.fromEntries(
    publishedMasters.map((m) => {
      const name =
        locale === "ru" ? m.nameRu : locale === "be" ? m.nameBe : m.nameEn;
      return [m.id, name];
    }),
  );
  const formMasters = publishedMasters.map((m) => ({
    id: m.id,
    name:
      locale === "ru" ? m.nameRu : locale === "be" ? m.nameBe : m.nameEn,
  }));

  return (
    <div className="pb-28">
      <AppHeader title={t("plate_title")} />

      <section className="relative overflow-hidden px-[22px] pt-4 pb-7">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <div className="relative z-10 flex items-center gap-4">
          {profile.avatar ? (
            <div className="gilded glass-top relative size-[68px] overflow-hidden rounded-full">
              <Image
                src={profile.avatar.src}
                alt={profile.avatar.alt ?? displayName}
                fill
                sizes="68px"
                placeholder={profile.avatar.blurDataURL ? "blur" : undefined}
                blurDataURL={profile.avatar.blurDataURL}
                className="object-cover"
              />
            </div>
          ) : (
            <div
              aria-hidden
              className="gilded glass-top grid size-[68px] place-items-center rounded-full font-display text-[24px] italic text-bg"
              style={{
                background: `linear-gradient(135deg, ${profile.palette[0]}, ${profile.palette[1]})`,
              }}
            >
              {initialsOf(displayName)}
            </div>
          )}
          <div>
            {tier.state === "vip" && (
              <span className="gilded inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                {t("badge_vip")}
              </span>
            )}
            {tier.state === "member-pending" && (
              <span className="rounded-full border-[0.5px] border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-2">
                {t("badge_pending_vip")}
              </span>
            )}
            <h1 className="mt-1.5 font-display text-[40px] font-light italic leading-none tracking-[-0.025em]">
              {displayName}
            </h1>
            <p className="mt-1.5 text-[12px] text-text-3">
              {t("joined", { year: joinedYear.toString() })}
            </p>
          </div>
        </div>
      </section>

      <section className="px-[22px] pb-7">
        <Eyebrow>{t("upcoming_eyebrow")}</Eyebrow>
        {!next ? (
          <p className="mt-3 text-[13px] text-text-3">{t("upcoming_empty")}</p>
        ) : (
          <SpotlightCard
            as="article"
            aria-label={t("next_visit_eyebrow")}
            className="gilded-lift glass-top relative mt-3 overflow-hidden rounded-[28px] px-5 py-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 opacity-60"
            >
              <NailFan palette={profile.palette} count={4} lift={4} />
            </div>
            <Eyebrow>{t("next_visit_eyebrow")}</Eyebrow>
            <p className="mt-3 font-display text-[26px] font-normal italic leading-tight">
              {serviceName(next.serviceId)}
            </p>
            <p className="mt-1.5 text-[13px] text-text-2">
              {formatDateTime(next.scheduledFor, locale)} ·{" "}
              {formatTime(next.scheduledFor, locale)}
            </p>
            {masterNameInLocale(next, locale) ? (
              <p className="mt-0.5 text-[12px] text-text-3">
                {t("with_master", { name: masterNameInLocale(next, locale) ?? "" })}
              </p>
            ) : null}
            <div className="mt-3.5">{renderAction(next)}</div>
          </SpotlightCard>
        )}
        {otherUpcoming.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {otherUpcoming.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-[16px] border-[0.5px] border-line px-4 py-3"
              >
                <div>
                  <p className="font-display text-[16px] italic">
                    {serviceName(row.serviceId)}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                    {formatDateTime(row.scheduledFor, locale)} ·{" "}
                    {formatTime(row.scheduledFor, locale)}
                  </p>
                </div>
                <div>{renderAction(row)}</div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* existing quick links nav stays — paste it back from the prior file body */}

      <section className="px-[22px] pt-9">
        <Eyebrow>{t("history_eyebrow")}</Eyebrow>
        <LetterpressRule className="mt-3" />
        {completedHistory.length === 0 ? (
          <p className="mt-3 text-[13px] text-text-3">{t("history_empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {completedHistory.map((row) => (
              <li
                key={row.id}
                className="flex items-baseline justify-between py-3.5"
              >
                <div>
                  <p className="font-display text-[19px] font-normal italic leading-tight">
                    {serviceName(row.serviceId)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                    {formatDateTime(row.scheduledFor, locale)} ·{" "}
                    {formatTime(row.scheduledFor, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pt-9">
        <Eyebrow>{t("testimonials_eyebrow")}</Eyebrow>
        <LetterpressRule className="mt-3" />
        <div className="mt-3">
          <TestimonialForm masters={formMasters} action={submitTestimonialAction} />
        </div>
        <div className="mt-5">
          <MyTestimonialsList
            rows={testimonials}
            masterNameById={masterNameById}
          />
        </div>
      </section>

      <TabBar />
    </div>
  );
}
```

Make sure to **paste the quick-links nav back from the prior file body** (the `<nav>` block with `QUICK_LINKS`). Don't remove existing functionality.

The route's `app/[locale]/profile/page.tsx` needs to pass `locale` to the view now (it currently calls `<ProfilePage />` with no args). Update the route:

```tsx
// app/[locale]/profile/page.tsx
return <ProfilePage locale={locale} />;
```

- [ ] **Step 3: Update the view test**

[views/profile/ui/profile-page.test.tsx](../../../views/profile/ui/profile-page.test.tsx) currently asserts mock copy. Rewrite it to:
- Mock `getCurrentSessionUser` to return a real-looking user.
- Mock `listUserBookings` to return a controlled set of rows.
- Assert that the spotlight shows the soonest upcoming row.
- Assert that an upcoming row >24h away shows a "Cancel visit" button, and a row ≤24h away shows a Telegram link.
- Assert empty states render when both lists are empty.
- Assert that anonymous (`getCurrentSessionUser` → null) calls `redirect`.

Use the same mocking style as Tasks 6 and 9.

- [ ] **Step 4: Run the full suite**

Run:
```bash
npx vitest run
```
Expected: every test passes (the e2e profile spec will still fail until Task 16; that's run separately, not by Vitest).

- [ ] **Step 5: Commit**

```bash
git add views/profile/ app/[locale]/profile/page.tsx
git commit -m "feat(views/profile): real bookings + cancel/contact + testimonials"
```

---

## Task 16: Rewrite `e2e/profile.spec.ts`

**Files:**
- Modify: [e2e/profile.spec.ts](../../../e2e/profile.spec.ts) — replace mock-copy assertions with anonymous-redirect coverage.

- [ ] **Step 1: Replace the spec**

```ts
import { test, expect } from "@playwright/test";

test("anonymous visit to /en/profile redirects to /en/sign-in", async ({ page }) => {
  await page.goto("/en/profile");
  await expect(page).toHaveURL(/\/en\/sign-in/);
  expect(page.url()).toContain("callbackUrl=%2Fen%2Fprofile");
});

test("anonymous visit to /be/profile redirects to /be/sign-in", async ({ page }) => {
  await page.goto("/be/profile");
  await expect(page).toHaveURL(/\/be\/sign-in/);
  expect(page.url()).toContain("callbackUrl=%2Fbe%2Fprofile");
});
```

(The callbackUrl shape may need adjustment — Auth.js's redirect helper may URL-encode `/en/profile` differently. After writing the test, run it once and tweak the regex if needed.)

- [ ] **Step 2: Run the e2e suite**

The Playwright server runs on port 3100 — stop any running `npm run dev` first.

Run:
```bash
npx playwright test e2e/profile.spec.ts
```
Expected: PASS for both tests.

- [ ] **Step 3: Commit**

```bash
git add e2e/profile.spec.ts
git commit -m "test(e2e/profile): assert anonymous redirect to /sign-in"
```

---

## Task 17: Final green + open PR

- [ ] **Step 1: Run the whole pipeline locally**

Run sequentially (any failure stops the chain):
```bash
npm run lint && npm test && npm run build && npx playwright test
```
Expected: all four exit 0.

- [ ] **Step 2: Push the branch**

Run:
```bash
git push -u origin feature/profile-real-data-and-testimonials
```

- [ ] **Step 3: Open the PR against `develop`**

Use the `pr-description` skill if available, or run:
```bash
gh pr create --base develop --title "feat(profile): real bookings + self-cancel + testimonials" --body "$(cat <<'EOF'
## Summary
- Replaces mock visits on /[locale]/profile with real DB-backed bookings (joined to masters).
- Adds self-cancel for upcoming bookings strictly >24h out; below the threshold the customer sees a Telegram contact link (per-master, with studio fallback, and a static line if neither is set).
- Ships a moderated public-testimonial submit/list surface for the customer. Admin moderation UI + public rendering on master pages are deferred to a follow-up spec.

## Test plan
- [ ] `npm run lint && npm test` green locally
- [ ] `npm run build` green locally
- [ ] `npx playwright test e2e/profile.spec.ts` green locally
- [ ] Manual: sign in, navigate to /profile — see real bookings; cancel a >24h booking; verify ≤24h booking shows Telegram link
- [ ] Manual: submit a testimonial — see it in "My testimonials" with Pending pill

Spec: docs/superpowers/specs/2026-05-23-profile-real-data-and-testimonials-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The pre-push hook runs `npm run build`. If it fails, fix and create a NEW commit (don't amend).

---

## Out of scope (do NOT implement here)

- Admin moderation UI for testimonials.
- Public rendering of approved testimonials on master pages.
- Booking reschedule.
- Master notifications on customer cancel.
- A signed-in Playwright fixture (the unit + RTL tests carry the happy-path coverage).
- Editing or deleting a submitted testimonial.

If any of these creep into a task, stop and surface — they're a separate spec.
