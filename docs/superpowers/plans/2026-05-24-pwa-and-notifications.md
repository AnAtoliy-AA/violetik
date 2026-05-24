# PWA + Opt-in Web Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the site as an installable PWA with a service worker, and add opt-in (default-off) browser push notifications for 8 customer + admin event categories.

**Architecture:** `@serwist/next` compiles a Next-aware service worker (`app/sw.ts` → `public/sw.js`) that owns caching + the push/notificationclick listeners. Server-side, a single `dispatchNotification(userId, category, payload)` function reads the user's preferences, fans out to every active subscription via `web-push`, prunes dead endpoints, and writes a log row. Server actions call it after each existing DB write; a cron handles the 24-hour booking reminder. UI lives in a new `features/notification-preferences` slice surfaced at `/[locale]/profile/notifications`.

**Tech Stack:** Next.js 16 App Router, React 19, `@serwist/next`, `web-push`, drizzle-orm + Postgres, next-auth v5, next-intl, Tailwind v4, Vitest, Playwright, Storybook.

**Spec:** [2026-05-24-pwa-and-notifications-design.md](../specs/2026-05-24-pwa-and-notifications-design.md)

**TDD / DRY / YAGNI / frequent commits.** Each task commits at its own scope; we do not stack two features in one commit. Reference [.claude/skills/commit/SKILL.md](../../../.claude/skills/commit/SKILL.md) for the conventional-commit format.

---

## File Map

### New files
- `app/sw.ts` — service worker entry (Serwist).
- `app/[locale]/offline/page.tsx` — offline fallback.
- `app/[locale]/profile/notifications/page.tsx` — settings route.
- `app/api/cron/booking-reminders/route.ts` — hourly reminder cron.
- `db/notification-preferences.ts` + `.test.ts`
- `db/push-subscriptions.ts` + `.test.ts`
- `db/notification-log.ts` + `.test.ts`
- `db/migrations/0016_pwa_notifications.sql` (generated)
- `shared/lib/notifications/types.ts`
- `shared/lib/notifications/dispatch.ts` + `.test.ts`
- `shared/lib/notifications/index.ts`
- `shared/lib/pwa/service-worker-registrar.tsx` + `.test.tsx`
- `features/notification-preferences/index.ts`
- `features/notification-preferences/api/actions.ts` + `.test.ts`
- `features/notification-preferences/model/use-push-subscription.ts` + `.test.ts`
- `features/notification-preferences/ui/notification-settings.tsx` + `.stories.tsx` + `.test.tsx`
- `features/notification-preferences/ui/enable-push-button.tsx` + `.stories.tsx`
- `views/profile-notifications/index.ts`
- `views/profile-notifications/ui/profile-notifications-page.tsx`
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- `e2e/notifications-settings.spec.ts`
- `vercel.json` (cron definition — first cron, so the file is new)

### Modified files
- `package.json` — add `web-push`, `@serwist/next`, `serwist`, `@types/web-push` dev.
- `next.config.ts` — wrap with `withSerwist`.
- `app/manifest.ts` — register PNGs.
- `app/[locale]/layout.tsx` — render `<ServiceWorkerRegistrar />` + `<head>` apple-touch-icon link.
- `db/schema.ts` — three new tables + `users.preferredLocale` column.
- `auth.ts` — write `preferred_locale` on Telegram authorize + Google signIn.
- `features/locale-switcher/ui/locale-switcher.tsx` — call `saveLocalePreference` after the locale change.
- `features/locale-switcher/api/save-locale.ts` (new file inside existing slice).
- `features/locale-switcher/index.ts` — re-export the new action.
- `views/booking/api/submit.ts` — dispatch `booking_created`.
- `features/booking-cancel/api/cancel-booking-action.ts` — dispatch `booking_cancelled`.
- `features/bookings-admin/api/actions.ts` — dispatch `booking_confirmed` + `booking_cancelled`.
- `features/vip-request-submit/api/actions.ts` — dispatch `vip_request_submitted`.
- `features/vip-requests-admin/api/actions.ts` — dispatch `vip_decision`.
- `features/testimonial-submit/api/submit-testimonial-action.ts` — dispatch `testimonial_submitted`.
- `features/testimonial-submit/api/change-request-actions.ts` — dispatch `testimonial_submitted` (edit/removal).
- `features/testimonials-admin/api/actions.ts` — dispatch `testimonial_decision`.
- `views/profile/ui/profile-page.tsx` — add notification-settings tile (link to `/profile/notifications`).
- `messages/{en,ru,by}.json` — `Notifications` namespace.
- `.env.example` — VAPID + CRON_SECRET docs.
- `e2e/manifest.spec.ts` — assert new PNG icon entries.

---

## Conventions
- Locale list lives in [i18n/routing.ts](../../../i18n/routing.ts) — `en`, `ru`, `by`.
- `db` client may be `null` (no `DATABASE_URL`); every DB function returns null/[] in that case. New helpers follow the same convention.
- Server actions are `"use server"`, return discriminated unions, and never throw to the caller.
- Notification dispatcher swallows all errors with `console.error` so a notification failure can never break a booking.
- Drizzle migrations are generated via `npm run db:generate` after editing `db/schema.ts`. Do **not** hand-edit SQL or snapshots.
- Commit after each completed task. Husky pre-commit runs lint + tests, so a failing test blocks the commit — fix before moving on.

---

## Phase A — Schema + DB helpers

### Task A1: Add `users.preferred_locale` column

**Files:**
- Modify: [db/schema.ts](../../../db/schema.ts)
- Test: [db/schema.test.ts](../../../db/schema.test.ts) (existing)

- [ ] **Step 1: Write failing test**

Append to `db/schema.test.ts`:

```ts
import { users } from "./schema";

describe("users.preferredLocale", () => {
  it("is declared on the schema", () => {
    // drizzle exposes column metadata under the symbol-keyed `[Columns]`
    // map; the typed accessor is enough here.
    expect(users.preferredLocale).toBeDefined();
  });
});
```

Run: `npx vitest run db/schema.test.ts -t "preferredLocale"` → FAIL.

- [ ] **Step 2: Add the column**

In `db/schema.ts`, inside the `users` `pgTable(...)` block (after `adminNote`):

```ts
preferredLocale: text("preferred_locale").notNull().default("en"),
```

- [ ] **Step 3: Re-run test**

Run: `npx vitest run db/schema.test.ts -t "preferredLocale"` → PASS.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/schema.test.ts
git commit -m "feat(db): users.preferred_locale column"
```

### Task A2: Add `notification_preferences` Drizzle table

**Files:**
- Modify: `db/schema.ts`
- Create: `db/notification-preferences.ts` + `db/notification-preferences.test.ts`

- [ ] **Step 1: Add table + types to schema**

In `db/schema.ts`, after `users`:

```ts
export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  categories: jsonb("categories")
    .$type<Partial<Record<string, boolean>>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type NotificationPreferencesRow =
  typeof notificationPreferences.$inferSelect;
```

- [ ] **Step 2: Write failing query-layer tests**

Create `db/notification-preferences.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "./notification-preferences";
import { db } from "./index";

describe("getNotificationPreferences", () => {
  it("returns empty map when row is missing", async () => {
    const map = await getNotificationPreferences("user_does_not_exist");
    expect(map).toEqual({});
  });
  it("returns null when DB unavailable", async () => {
    if (db) return; // only meaningful with null db
    const map = await getNotificationPreferences("any");
    expect(map).toEqual({});
  });
});

describe("setNotificationPreference", () => {
  it("no-ops when DB unavailable (returns null)", async () => {
    if (db) return;
    const result = await setNotificationPreference("u", "booking_confirmed", true);
    expect(result).toBeNull();
  });
});
```

Run: `npx vitest run db/notification-preferences.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement the helpers**

Create `db/notification-preferences.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

export type NotificationCategoryMap = Partial<Record<string, boolean>>;

/**
 * Reads a user's category opt-ins. Missing rows → empty map.
 * Empty map = nothing enabled, which matches our default-off policy.
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationCategoryMap> {
  if (!db) return {};
  const rows = await db
    .select({ categories: schema.notificationPreferences.categories })
    .from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.userId, userId))
    .limit(1);
  return rows[0]?.categories ?? {};
}

/**
 * Upserts the full categories map. Caller passes the *complete* current
 * map, not a delta — simpler reasoning, no surprises if the keyset
 * changes between writes.
 */
export async function saveNotificationPreferences(
  userId: string,
  categories: NotificationCategoryMap,
): Promise<NotificationCategoryMap | null> {
  if (!db) return null;
  const rows = await db
    .insert(schema.notificationPreferences)
    .values({ userId, categories })
    .onConflictDoUpdate({
      target: schema.notificationPreferences.userId,
      set: { categories, updatedAt: sql`now()` },
    })
    .returning({ categories: schema.notificationPreferences.categories });
  return rows[0]?.categories ?? null;
}

/** Convenience for single-key toggles from the settings UI. */
export async function setNotificationPreference(
  userId: string,
  category: string,
  enabled: boolean,
): Promise<NotificationCategoryMap | null> {
  const current = await getNotificationPreferences(userId);
  return saveNotificationPreferences(userId, { ...current, [category]: enabled });
}
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run db/notification-preferences.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/notification-preferences.ts db/notification-preferences.test.ts
git commit -m "feat(db): notification_preferences table + query helpers"
```

### Task A3: Add `push_subscriptions` table + CRUD

**Files:**
- Modify: `db/schema.ts`
- Create: `db/push-subscriptions.ts` + `db/push-subscriptions.test.ts`

- [ ] **Step 1: Schema**

In `db/schema.ts`:

```ts
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("push_subscriptions_user_idx").on(table.userId),
  }),
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
```

- [ ] **Step 2: Failing tests**

Create `db/push-subscriptions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  saveSubscription,
  listSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
  touchSubscription,
} from "./push-subscriptions";
import { db } from "./index";

describe("listSubscriptionsByUser", () => {
  it("returns [] when DB unavailable", async () => {
    if (db) return;
    expect(await listSubscriptionsByUser("u")).toEqual([]);
  });
});

describe("saveSubscription", () => {
  it("returns null when DB unavailable", async () => {
    if (db) return;
    const r = await saveSubscription({
      userId: "u", endpoint: "https://x", p256dh: "p", auth: "a", userAgent: null,
    });
    expect(r).toBeNull();
  });
});

describe("deleteSubscriptionByEndpoint", () => {
  it("no-ops when DB unavailable", async () => {
    if (db) return;
    expect(await deleteSubscriptionByEndpoint("https://x")).toBe(false);
  });
});
```

Run: `npx vitest run db/push-subscriptions.test.ts` → FAIL.

- [ ] **Step 3: Implementation**

Create `db/push-subscriptions.ts`:

```ts
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

export interface NewPushSubscription {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

function generateId(): string {
  return `pushsub_${randomBytes(8).toString("hex")}`;
}

/** Upsert keyed on endpoint (which is globally unique per browser). */
export async function saveSubscription(
  input: NewPushSubscription,
): Promise<schema.PushSubscriptionRow | null> {
  if (!db) return null;
  const id = generateId();
  const rows = await db
    .insert(schema.pushSubscriptions)
    .values({ id, ...input })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        lastSeenAt: sql`now()`,
      },
    })
    .returning();
  return rows[0] ?? null;
}

export async function listSubscriptionsByUser(
  userId: string,
): Promise<schema.PushSubscriptionRow[]> {
  if (!db) return [];
  return db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));
}

export async function deleteSubscriptionByEndpoint(
  endpoint: string,
): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .delete(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
    .returning({ id: schema.pushSubscriptions.id });
  return rows.length > 0;
}

export async function touchSubscription(endpoint: string): Promise<void> {
  if (!db) return;
  await db
    .update(schema.pushSubscriptions)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(schema.pushSubscriptions.endpoint, endpoint));
}
```

- [ ] **Step 4: Run tests, commit**

```
npx vitest run db/push-subscriptions.test.ts          # PASS
git add db/schema.ts db/push-subscriptions.ts db/push-subscriptions.test.ts
git commit -m "feat(db): push_subscriptions table + CRUD"
```

### Task A4: Add `notification_log` table + helpers

**Files:**
- Modify: `db/schema.ts`
- Create: `db/notification-log.ts` + `db/notification-log.test.ts`

- [ ] **Step 1: Schema**

```ts
export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull(), // 'sent' | 'skipped_prefs' | 'no_subscriptions' | 'all_failed'
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("notification_log_user_idx").on(table.userId, table.sentAt),
    categoryIdx: index("notification_log_category_idx").on(
      table.category,
      table.sentAt,
    ),
  }),
);

export type NotificationLogRow = typeof notificationLog.$inferSelect;
```

- [ ] **Step 2: Failing test**

Create `db/notification-log.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  recordNotification,
  hasRecentBookingReminder,
} from "./notification-log";
import { db } from "./index";

describe("recordNotification", () => {
  it("returns null when DB unavailable", async () => {
    if (db) return;
    expect(
      await recordNotification({
        userId: "u",
        category: "booking_confirmed",
        payload: { bookingId: "bk_x" },
        status: "sent",
        error: null,
      }),
    ).toBeNull();
  });
});

describe("hasRecentBookingReminder", () => {
  it("returns false when DB unavailable", async () => {
    if (db) return;
    expect(await hasRecentBookingReminder("bk_x")).toBe(false);
  });
});
```

Run: FAIL.

- [ ] **Step 3: Implementation**

Create `db/notification-log.ts`:

```ts
import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "./index";

export type NotificationLogStatus =
  | "sent"
  | "skipped_prefs"
  | "no_subscriptions"
  | "all_failed";

export interface NotificationLogInput {
  userId: string;
  category: string;
  payload: Record<string, unknown>;
  status: NotificationLogStatus;
  error: string | null;
}

function generateId(): string {
  return `notif_${randomBytes(8).toString("hex")}`;
}

export async function recordNotification(
  input: NotificationLogInput,
): Promise<schema.NotificationLogRow | null> {
  if (!db) return null;
  const rows = await db
    .insert(schema.notificationLog)
    .values({ id: generateId(), ...input })
    .returning();
  return rows[0] ?? null;
}

/**
 * The hourly cron looks 23–25 h ahead, so the same booking lands in
 * its window for two consecutive hours. Dedup by checking for an
 * existing reminder log row in the last 48 h.
 */
export async function hasRecentBookingReminder(
  bookingId: string,
): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .select({ id: schema.notificationLog.id })
    .from(schema.notificationLog)
    .where(
      and(
        eq(schema.notificationLog.category, "booking_reminder_24h"),
        sql`${schema.notificationLog.payload}->>'bookingId' = ${bookingId}`,
        sql`${schema.notificationLog.sentAt} > now() - interval '48 hours'`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}
```

- [ ] **Step 4: Run + commit**

```
npx vitest run db/notification-log.test.ts          # PASS
git add db/schema.ts db/notification-log.ts db/notification-log.test.ts
git commit -m "feat(db): notification_log table + dedup helper"
```

### Task A5: Generate the Drizzle migration

**Files:**
- Create: `db/migrations/0016_pwa_notifications.sql` (drizzle-kit emits)
- Modify: `db/migrations/meta/_journal.json` + `db/migrations/meta/0016_snapshot.json` (drizzle-kit emits)

- [ ] **Step 1: Generate**

Run: `npm run db:generate`

Expected: drizzle-kit prints a summary listing the new column + three new tables and writes the SQL file. If the file name diverges from `0016_pwa_notifications.sql`, **rename it manually** to keep the numbering aligned (the journal records the migration name; edit both).

- [ ] **Step 2: Inspect the generated SQL**

Confirm it contains: `ALTER TABLE users ADD COLUMN preferred_locale`, `CREATE TABLE notification_preferences`, `CREATE TABLE push_subscriptions`, `CREATE TABLE notification_log`, and the indexes.

- [ ] **Step 3: Apply locally (if DB is configured)**

Run: `npm run db:migrate` → should print one applied migration.

If `DATABASE_URL` isn't set locally the migration runs in CI/prod; skip this step.

- [ ] **Step 4: Commit**

```bash
git add db/migrations
git commit -m "feat(db): migration 0016 — PWA + notifications schema"
```

---

## Phase B — Notification dispatcher

### Task B1: Dependencies + env

**Files:**
- Modify: `package.json`, `.env.example`

- [ ] **Step 1: Install runtime deps**

Run: `npm install web-push @serwist/next serwist`

- [ ] **Step 2: Install types**

Run: `npm install -D @types/web-push`

- [ ] **Step 3: Generate VAPID keys for local dev**

Run: `npx web-push generate-vapid-keys` and copy the two values into `.env.local`:

```
VAPID_PUBLIC_KEY="<public from above>"
VAPID_PRIVATE_KEY="<private from above>"
VAPID_SUBJECT="mailto:hello@violetta.example.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<same value as VAPID_PUBLIC_KEY>"
CRON_SECRET="dev-cron-secret"
```

- [ ] **Step 4: Document in `.env.example`**

Append the block from spec §10 verbatim to `.env.example`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: web-push + serwist deps, VAPID/.env docs"
```

### Task B2: Notification type definitions

**Files:**
- Create: `shared/lib/notifications/types.ts`

- [ ] **Step 1: Write the types**

```ts
export const NOTIFICATION_CATEGORIES = [
  "booking_created",
  "booking_confirmed",
  "booking_cancelled",
  "booking_reminder_24h",
  "vip_decision",
  "vip_request_submitted",
  "testimonial_decision",
  "testimonial_submitted",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const ADMIN_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  "booking_created",
  "vip_request_submitted",
  "testimonial_submitted",
]);

/**
 * Dispatcher input. `titleKey` and `bodyKey` are i18n keys under the
 * `Notifications` namespace; `bodyParams` interpolates into them
 * server-side using the recipient's `preferred_locale`. `url` is the
 * deep-link the SW opens on notificationclick.
 */
export interface NotificationPayload {
  titleKey: string;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  url: string;
  /** Optional structured metadata stored in notification_log.payload. */
  meta?: Record<string, unknown>;
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/lib/notifications/types.ts
git commit -m "feat(notifications): category + payload types"
```

### Task B3: Dispatcher core

**Files:**
- Create: `shared/lib/notifications/dispatch.ts` + `.test.ts`
- Create: `shared/lib/notifications/index.ts`

- [ ] **Step 1: Failing test scaffold**

Create `shared/lib/notifications/dispatch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@/db/users", () => ({
  getUserById: vi.fn(),
}));
vi.mock("@/db/notification-preferences", () => ({
  getNotificationPreferences: vi.fn(),
}));
vi.mock("@/db/push-subscriptions", () => ({
  listSubscriptionsByUser: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn(),
  touchSubscription: vi.fn(),
}));
vi.mock("@/db/notification-log", () => ({
  recordNotification: vi.fn(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (k: string, p?: Record<string, string>) =>
    p ? `${k}:${JSON.stringify(p)}` : k,
  ),
}));

import { dispatchNotification } from "./dispatch";
import { getUserById } from "@/db/users";
import { getNotificationPreferences } from "@/db/notification-preferences";
import { listSubscriptionsByUser } from "@/db/push-subscriptions";
import { recordNotification } from "@/db/notification-log";

beforeEach(() => vi.clearAllMocks());

describe("dispatchNotification — gating", () => {
  it("logs 'skipped_prefs' when user is missing", async () => {
    vi.mocked(getUserById).mockResolvedValue(null);
    await dispatchNotification("missing", "booking_confirmed", {
      titleKey: "t", bodyKey: "b", url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "skipped_prefs",
    );
  });

  it("logs 'skipped_prefs' when category is disabled (default-off)", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: "u", role: "customer", preferredLocale: "en",
    } as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({});
    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t", bodyKey: "b", url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "skipped_prefs",
    );
  });

  it("skips admin-only category for a customer", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: "u", role: "customer", preferredLocale: "en",
    } as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_created: true,
    });
    await dispatchNotification("u", "booking_created", {
      titleKey: "t", bodyKey: "b", url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "skipped_prefs",
    );
  });

  it("logs 'no_subscriptions' when enabled but no devices", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: "u", role: "customer", preferredLocale: "en",
    } as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_confirmed: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([]);
    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t", bodyKey: "b", url: "/x",
    });
    expect(vi.mocked(recordNotification).mock.calls[0]?.[0].status).toBe(
      "no_subscriptions",
    );
  });
});
```

Run: `npx vitest run shared/lib/notifications/dispatch.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement the dispatcher**

Create `shared/lib/notifications/dispatch.ts`:

```ts
import "server-only";
import webpush from "web-push";
import { getTranslations } from "next-intl/server";
import { getUserById } from "@/db/users";
import { getNotificationPreferences } from "@/db/notification-preferences";
import {
  listSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
  touchSubscription,
} from "@/db/push-subscriptions";
import { recordNotification } from "@/db/notification-log";
import {
  ADMIN_CATEGORIES,
  type NotificationCategory,
  type NotificationPayload,
} from "./types";

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !sub) return false;
  webpush.setVapidDetails(sub, pub, priv);
  vapidConfigured = true;
  return true;
}

/**
 * Fire-and-forget by convention — the function returns void and never
 * throws to the caller. Every failure path writes a notification_log
 * row so dispatch behavior is auditable post hoc.
 */
export async function dispatchNotification(
  userId: string,
  category: NotificationCategory,
  payload: NotificationPayload,
): Promise<void> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      await recordNotification({
        userId, category, payload: { ...payload, reason: "user_missing" },
        status: "skipped_prefs", error: null,
      });
      return;
    }

    const prefs = await getNotificationPreferences(userId);
    const enabled = prefs[category] === true;
    if (!enabled) {
      await recordNotification({
        userId, category, payload: { ...payload, reason: "category_off" },
        status: "skipped_prefs", error: null,
      });
      return;
    }

    if (ADMIN_CATEGORIES.has(category) && user.role !== "admin") {
      await recordNotification({
        userId, category, payload: { ...payload, reason: "not_admin" },
        status: "skipped_prefs", error: null,
      });
      return;
    }

    const subs = await listSubscriptionsByUser(userId);
    if (subs.length === 0) {
      await recordNotification({
        userId, category, payload, status: "no_subscriptions", error: null,
      });
      return;
    }

    if (!configureVapid()) {
      await recordNotification({
        userId, category, payload, status: "all_failed",
        error: "vapid_not_configured",
      });
      return;
    }

    const locale = user.preferredLocale ?? "en";
    const t = await getTranslations({ locale, namespace: "Notifications" });
    const title = t(payload.titleKey, payload.bodyParams ?? {});
    const body = t(payload.bodyKey, payload.bodyParams ?? {});
    const pushBody = JSON.stringify({
      title, body, url: payload.url, tag: category,
    });

    let anySuccess = false;
    let lastErr: string | null = null;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushBody,
        );
        anySuccess = true;
        await touchSubscription(sub.endpoint);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
        }
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }

    await recordNotification({
      userId, category, payload: { ...payload.meta, ...payload },
      status: anySuccess ? "sent" : "all_failed",
      error: anySuccess ? null : lastErr,
    });
  } catch (err) {
    // Never throw to the caller. Booking flows must not break on a
    // notification failure.
    console.error(
      "[dispatchNotification] unexpected error for user=%s category=%s: %o",
      userId, category, err,
    );
  }
}
```

Create `shared/lib/notifications/index.ts`:

```ts
export { dispatchNotification } from "./dispatch";
export {
  NOTIFICATION_CATEGORIES,
  ADMIN_CATEGORIES,
  type NotificationCategory,
  type NotificationPayload,
} from "./types";
```

- [ ] **Step 3: Run tests, add more coverage**

Run: `npx vitest run shared/lib/notifications/dispatch.test.ts` → 4 PASS.

Append two more tests:

```ts
import webpush from "web-push";
import { deleteSubscriptionByEndpoint, touchSubscription } from "@/db/push-subscriptions";

describe("dispatchNotification — fan-out", () => {
  it("prunes endpoint on 410 Gone", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:x@y";

    vi.mocked(getUserById).mockResolvedValue({
      id: "u", role: "customer", preferredLocale: "en",
    } as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_confirmed: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([
      { id: "1", userId: "u", endpoint: "https://dead", p256dh: "p", auth: "a", userAgent: null, createdAt: new Date(), lastSeenAt: new Date() },
    ] as never);
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });

    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t", bodyKey: "b", url: "/x",
    });

    expect(deleteSubscriptionByEndpoint).toHaveBeenCalledWith("https://dead");
    expect(vi.mocked(recordNotification).mock.calls.at(-1)?.[0].status).toBe(
      "all_failed",
    );
  });

  it("records 'sent' when any device succeeds", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: "u", role: "customer", preferredLocale: "en",
    } as never);
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      booking_confirmed: true,
    });
    vi.mocked(listSubscriptionsByUser).mockResolvedValue([
      { id: "1", userId: "u", endpoint: "https://ok", p256dh: "p", auth: "a", userAgent: null, createdAt: new Date(), lastSeenAt: new Date() },
    ] as never);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

    await dispatchNotification("u", "booking_confirmed", {
      titleKey: "t", bodyKey: "b", url: "/x",
    });

    expect(touchSubscription).toHaveBeenCalledWith("https://ok");
    expect(vi.mocked(recordNotification).mock.calls.at(-1)?.[0].status).toBe(
      "sent",
    );
  });
});
```

Run: `npx vitest run shared/lib/notifications/dispatch.test.ts` → 6 PASS.

- [ ] **Step 4: Commit**

```bash
git add shared/lib/notifications
git commit -m "feat(notifications): dispatcher with default-off gates + prune + log"
```

---

## Phase C — PWA shell

### Task C1: Service worker source

**Files:**
- Create: `app/sw.ts`

- [ ] **Step 1: Write the SW**

```ts
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/en/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

/** Inbound push from web-push. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data: { title: string; body: string; url: string; tag?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: "Violetta", body: event.data.text(), url: "/" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
      tag: data.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | null)?.url ?? "/";
  event.waitUntil(self.clients.openWindow(target));
});
```

- [ ] **Step 2: Commit**

```bash
git add app/sw.ts
git commit -m "feat(pwa): service worker with caching + push handler"
```

### Task C2: Wire `withSerwist` into Next config

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace export**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // (unchanged) ...
};

export default withSerwist(withNextIntl(nextConfig));
```

(Keep the existing `allowedDevOrigins`, `experimental.viewTransition`, and `images` blocks intact.)

- [ ] **Step 2: Verify build still runs**

Run: `npm run build` → should produce `public/sw.js`. Production-only; dev disables the SW.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(pwa): compile sw.ts via @serwist/next"
```

### Task C3: Icon assets

**Files:**
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`

- [ ] **Step 1: Generate PNGs from `app/icon.svg`**

Use a one-off script (do **not** commit a node script — run inline):

```bash
npx --yes sharp-cli --input app/icon.svg --output public/icon-192.png resize 192 192 -- --background '#100612'
npx --yes sharp-cli --input app/icon.svg --output public/icon-512.png resize 512 512 -- --background '#100612'
npx --yes sharp-cli --input app/icon.svg --output public/icon-maskable-512.png resize 512 512 --extend 64 -- --background '#100612'
npx --yes sharp-cli --input app/icon.svg --output public/apple-touch-icon.png resize 180 180 -- --background '#100612'
```

If `sharp-cli` is unavailable, fall back to manual export from the source SVG using ImageMagick or design tools — the four files just have to exist with the named dimensions.

- [ ] **Step 2: Verify**

Run: `file public/icon-*.png public/apple-touch-icon.png` → expect "PNG image data, NxN".

- [ ] **Step 3: Commit**

```bash
git add public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png
git commit -m "feat(pwa): PNG + maskable + apple-touch icon set"
```

### Task C4: Extend manifest + e2e

**Files:**
- Modify: `app/manifest.ts`, `e2e/manifest.spec.ts`

- [ ] **Step 1: Failing e2e assertion**

In `e2e/manifest.spec.ts`, append within the first test block (after the existing `icons.length` check):

```ts
const icons: Array<{ src: string; purpose?: string; sizes?: string }> = body.icons;
expect(icons.some((i) => i.src === "/icon-192.png" && i.sizes === "192x192")).toBe(true);
expect(icons.some((i) => i.src === "/icon-512.png" && i.sizes === "512x512")).toBe(true);
expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
```

Run: `npx playwright test e2e/manifest.spec.ts` → FAIL on the new assertions.

- [ ] **Step 2: Extend manifest**

Update `app/manifest.ts` `icons` array to include the new PNGs:

```ts
icons: [
  { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
  { src: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
  { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
],
```

- [ ] **Step 3: Re-run e2e**

```
npx playwright test e2e/manifest.spec.ts          # PASS
```

- [ ] **Step 4: Commit**

```bash
git add app/manifest.ts e2e/manifest.spec.ts
git commit -m "feat(pwa): manifest registers PNG + maskable icons"
```

### Task C5: Offline page

**Files:**
- Create: `app/[locale]/offline/page.tsx`

- [ ] **Step 1: Page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OfflinePage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Notifications" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl">{t("offline_title")}</h1>
      <p className="max-w-prose text-text-2">{t("offline_body")}</p>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/offline/page.tsx
git commit -m "feat(pwa): offline fallback page for all locales"
```

### Task C6: Service-worker registrar (client)

**Files:**
- Create: `shared/lib/pwa/service-worker-registrar.tsx` + `.test.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Failing test**

Create `shared/lib/pwa/service-worker-registrar.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServiceWorkerRegistrar } from "./service-worker-registrar";

describe("ServiceWorkerRegistrar", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders null", () => {
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container.firstChild).toBeNull();
  });

  it("calls navigator.serviceWorker.register when available", async () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    const fire = () => window.dispatchEvent(new Event("load"));
    render(<ServiceWorkerRegistrar />);
    fire();
    await new Promise((r) => setTimeout(r, 0));
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });
});
```

Run: FAIL (module missing).

- [ ] **Step 2: Implement**

```tsx
"use client";

import { useEffect } from "react";

/**
 * Registers the Serwist-built service worker once on every client mount.
 * Silent component — no UI. Guards on browser support; dev builds skip
 * registration because Serwist disables the SW in development mode and
 * the file wouldn't exist.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[sw] register failed:", err));
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);
  return null;
}
```

- [ ] **Step 3: Mount in layout**

In `app/[locale]/layout.tsx`, add the import near the top and render inside `<body>` *after* `<NextIntlClientProvider>` opens:

```tsx
import { ServiceWorkerRegistrar } from "@/shared/lib/pwa/service-worker-registrar";
// ...
<NextIntlClientProvider>
  <ServiceWorkerRegistrar />
  {children}
  <SiteFooter />
</NextIntlClientProvider>
```

Also append a `link[rel=apple-touch-icon]` reference to the metadata `icons` block (`apple` array):

```ts
icons: {
  icon: [...existing],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
},
```

- [ ] **Step 4: Run tests**

```
npx vitest run shared/lib/pwa/service-worker-registrar.test.tsx     # PASS
npm run build                                                       # still passes
```

- [ ] **Step 5: Commit**

```bash
git add shared/lib/pwa app/[locale]/layout.tsx
git commit -m "feat(pwa): client-side SW registration + apple-touch link"
```

---

## Phase D — Settings UI (`features/notification-preferences`)

### Task D1: Server actions

**Files:**
- Create: `features/notification-preferences/api/actions.ts` + `.test.ts`
- Create: `features/notification-preferences/index.ts`

- [ ] **Step 1: Failing test**

Create `features/notification-preferences/api/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/db/push-subscriptions", () => ({
  saveSubscription: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn(),
}));
vi.mock("@/db/notification-preferences", () => ({
  setNotificationPreference: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  toggleCategoryAction,
} from "./actions";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";

beforeEach(() => vi.clearAllMocks());

describe("toggleCategoryAction", () => {
  it("rejects unauthenticated", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    const r = await toggleCategoryAction("booking_confirmed", true);
    expect(r).toEqual({ ok: false, reason: "unauthenticated" });
  });
  it("rejects unknown category", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "u" } as never);
    // @ts-expect-error testing runtime guard
    const r = await toggleCategoryAction("nope", true);
    expect(r).toEqual({ ok: false, reason: "invalid_category" });
  });
});

describe("savePushSubscriptionAction", () => {
  it("rejects unauthenticated", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    const r = await savePushSubscriptionAction({
      endpoint: "https://x", p256dh: "p", auth: "a", userAgent: "ua",
    });
    expect(r).toEqual({ ok: false, reason: "unauthenticated" });
  });
});
```

Run: FAIL.

- [ ] **Step 2: Implement**

Create `features/notification-preferences/api/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import {
  saveSubscription,
  deleteSubscriptionByEndpoint,
} from "@/db/push-subscriptions";
import { setNotificationPreference } from "@/db/notification-preferences";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/shared/lib/notifications";

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid_category" | "db_error" };

export interface SaveSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

export async function savePushSubscriptionAction(
  input: SaveSubscriptionInput,
): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const row = await saveSubscription({
    userId: user.id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent,
  });
  if (!row) return { ok: false, reason: "db_error" };
  revalidatePath("/[locale]/profile/notifications", "page");
  return { ok: true };
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  await deleteSubscriptionByEndpoint(endpoint);
  revalidatePath("/[locale]/profile/notifications", "page");
  return { ok: true };
}

const CATEGORY_SET = new Set<string>(NOTIFICATION_CATEGORIES);

export async function toggleCategoryAction(
  category: NotificationCategory,
  enabled: boolean,
): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  if (!CATEGORY_SET.has(category)) {
    return { ok: false, reason: "invalid_category" };
  }
  await setNotificationPreference(user.id, category, enabled);
  revalidatePath("/[locale]/profile/notifications", "page");
  return { ok: true };
}
```

Create `features/notification-preferences/index.ts`:

```ts
export {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  toggleCategoryAction,
  type ActionResult,
} from "./api/actions";
export { NotificationSettings } from "./ui/notification-settings";
export { EnablePushButton } from "./ui/enable-push-button";
```

- [ ] **Step 3: Re-run, commit**

```
npx vitest run features/notification-preferences/api/actions.test.ts     # PASS
git add features/notification-preferences
git commit -m "feat(notification-prefs): server actions (save sub, remove sub, toggle)"
```

### Task D2: Push-subscription client store

**Files:**
- Create: `features/notification-preferences/model/use-push-subscription.ts` + `.test.ts`

- [ ] **Step 1: Tests first**

Create `features/notification-preferences/model/use-push-subscription.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePushSubscription } from "./use-push-subscription";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("usePushSubscription", () => {
  it("reports 'unsupported' when PushManager is missing", () => {
    vi.stubGlobal("window", { ...window, PushManager: undefined });
    const { result } = renderHook(() => usePushSubscription("VAPID"));
    expect(result.current.status).toBe("unsupported");
  });

  it("reports 'denied' when Notification.permission is denied", () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    const { result } = renderHook(() => usePushSubscription("VAPID"));
    expect(result.current.status).toBe("denied");
  });
});
```

Run: FAIL.

- [ ] **Step 2: Implement the hook**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "denied"
  | "idle"          // permission default, no subscription
  | "subscribed";

interface State {
  status: PushStatus;
  endpoint: string | null;
}

const initialState: State = { status: "loading", endpoint: null };

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushSubscription(vapidPublicKey: string) {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
      setState({ status: "unsupported", endpoint: null });
      return;
    }
    if (Notification.permission === "denied") {
      setState({ status: "denied", endpoint: null });
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState({
        status: sub ? "subscribed" : "idle",
        endpoint: sub?.endpoint ?? null,
      });
    });
  }, []);

  const subscribe = useCallback(async (): Promise<{
    endpoint: string; p256dh: string; auth: string;
  } | null> => {
    if (!("PushManager" in window)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState({ status: "denied", endpoint: null });
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    const raw = sub.toJSON();
    setState({ status: "subscribed", endpoint: sub.endpoint });
    return {
      endpoint: sub.endpoint,
      p256dh: raw.keys?.p256dh ?? "",
      auth: raw.keys?.auth ?? "",
    };
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<string | null> => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      setState({ status: "idle", endpoint: null });
      return null;
    }
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    setState({ status: "idle", endpoint: null });
    return endpoint;
  }, []);

  return { ...state, subscribe, unsubscribe };
}
```

- [ ] **Step 3: Run + commit**

```
npx vitest run features/notification-preferences/model/use-push-subscription.test.ts   # PASS
git add features/notification-preferences/model
git commit -m "feat(notification-prefs): push-subscription state hook"
```

### Task D3: `<EnablePushButton />`

**Files:**
- Create: `features/notification-preferences/ui/enable-push-button.tsx` + `.stories.tsx`

- [ ] **Step 1: Component**

```tsx
"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/ui/button";
import { usePushSubscription } from "../model/use-push-subscription";
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
} from "../api/actions";

export interface EnablePushButtonProps {
  vapidPublicKey: string;
}

export function EnablePushButton({ vapidPublicKey }: EnablePushButtonProps) {
  const t = useTranslations("Notifications");
  const [pending, startTransition] = useTransition();
  const { status, subscribe, unsubscribe } = usePushSubscription(vapidPublicKey);

  if (status === "unsupported") {
    return <p className="text-text-2 text-sm">{t("unsupported")}</p>;
  }
  if (status === "denied") {
    return <p className="text-text-2 text-sm">{t("denied")}</p>;
  }

  const onClick = () => {
    startTransition(async () => {
      if (status === "subscribed") {
        const ep = await unsubscribe();
        if (ep) await removePushSubscriptionAction(ep);
      } else {
        const sub = await subscribe();
        if (sub)
          await savePushSubscriptionAction({
            ...sub,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          });
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending || status === "loading"}
      variant={status === "subscribed" ? "outline" : "solid"}
    >
      {status === "subscribed" ? t("disable_browser") : t("enable_browser")}
    </Button>
  );
}
```

- [ ] **Step 2: Story**

Create `features/notification-preferences/ui/enable-push-button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnablePushButton } from "./enable-push-button";

const meta: Meta<typeof EnablePushButton> = {
  component: EnablePushButton,
  args: { vapidPublicKey: "BPLACEHOLDER" },
};
export default meta;
type Story = StoryObj<typeof EnablePushButton>;

export const Default: Story = {};
```

- [ ] **Step 3: Commit**

```bash
git add features/notification-preferences/ui/enable-push-button.tsx features/notification-preferences/ui/enable-push-button.stories.tsx
git commit -m "feat(notification-prefs): enable-push button"
```

### Task D4: `<NotificationSettings />`

**Files:**
- Create: `features/notification-preferences/ui/notification-settings.tsx` + `.test.tsx` + `.stories.tsx`

- [ ] **Step 1: Test**

```tsx
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, it, expect } from "vitest";
import { NotificationSettings } from "./notification-settings";
import messages from "@/messages/en.json";

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

describe("NotificationSettings", () => {
  it("renders eight categories for an admin user", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin
          initialPreferences={{}}
          vapidPublicKey="X"
        />,
      ),
    );
    expect(screen.getAllByRole("switch")).toHaveLength(8);
  });

  it("hides admin categories for a customer", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin={false}
          initialPreferences={{}}
          vapidPublicKey="X"
        />,
      ),
    );
    expect(screen.getAllByRole("switch")).toHaveLength(5);
  });

  it("defaults every switch to unchecked", () => {
    render(
      wrap(
        <NotificationSettings
          isAdmin
          initialPreferences={{}}
          vapidPublicKey="X"
        />,
      ),
    );
    screen.getAllByRole("switch").forEach((sw) =>
      expect(sw).toHaveAttribute("aria-checked", "false"),
    );
  });
});
```

Run: FAIL.

- [ ] **Step 2: Component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  NOTIFICATION_CATEGORIES,
  ADMIN_CATEGORIES,
  type NotificationCategory,
} from "@/shared/lib/notifications";
import { toggleCategoryAction } from "../api/actions";
import { EnablePushButton } from "./enable-push-button";
import { cn } from "@/shared/lib/cn";

export interface NotificationSettingsProps {
  isAdmin: boolean;
  initialPreferences: Partial<Record<NotificationCategory, boolean>>;
  vapidPublicKey: string;
}

export function NotificationSettings({
  isAdmin,
  initialPreferences,
  vapidPublicKey,
}: NotificationSettingsProps) {
  const t = useTranslations("Notifications");
  const [prefs, setPrefs] = useState(initialPreferences);
  const [, startTransition] = useTransition();

  const visible = NOTIFICATION_CATEGORIES.filter(
    (c) => isAdmin || !ADMIN_CATEGORIES.has(c),
  );

  const toggle = (c: NotificationCategory) => {
    const next = !(prefs[c] ?? false);
    setPrefs((prev) => ({ ...prev, [c]: next }));
    startTransition(() => {
      void toggleCategoryAction(c, next);
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl">{t("page_title")}</h1>
        <p className="text-text-2">{t("intro")}</p>
      </header>

      <EnablePushButton vapidPublicKey={vapidPublicKey} />

      <ul className="flex flex-col gap-3">
        {visible.map((c) => {
          const checked = prefs[c] === true;
          return (
            <li
              key={c}
              className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface/40 px-4 py-3"
            >
              <span className="text-text">{t(`category_${c}_label`)}</span>
              <button
                role="switch"
                aria-checked={checked}
                onClick={() => toggle(c)}
                className={cn(
                  "h-6 w-11 rounded-full border border-line transition-colors",
                  checked ? "bg-accent" : "bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "block h-5 w-5 translate-y-px rounded-full bg-bg transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Story**

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NotificationSettings } from "./notification-settings";

const meta: Meta<typeof NotificationSettings> = {
  component: NotificationSettings,
  args: { vapidPublicKey: "PLACEHOLDER", initialPreferences: {} },
};
export default meta;
type Story = StoryObj<typeof NotificationSettings>;

export const CustomerDefault: Story = { args: { isAdmin: false } };
export const AdminDefault: Story = { args: { isAdmin: true } };
export const AdminMixedOn: Story = {
  args: {
    isAdmin: true,
    initialPreferences: {
      booking_created: true, booking_reminder_24h: true, vip_decision: true,
    },
  },
};
```

- [ ] **Step 4: Run + commit**

```
npx vitest run features/notification-preferences/ui/notification-settings.test.tsx   # PASS
git add features/notification-preferences/ui
git commit -m "feat(notification-prefs): settings panel with per-category toggles"
```

### Task D5: View + page route

**Files:**
- Create: `views/profile-notifications/index.ts`
- Create: `views/profile-notifications/ui/profile-notifications-page.tsx`
- Create: `app/[locale]/profile/notifications/page.tsx`

- [ ] **Step 1: View**

`views/profile-notifications/ui/profile-notifications-page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getNotificationPreferences } from "@/db/notification-preferences";
import { NotificationSettings } from "@/features/notification-preferences";

export async function ProfileNotificationsPage({ locale }: { locale: string }) {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/profile/notifications`);
  }
  const [t, prefs] = await Promise.all([
    getTranslations("Notifications"),
    getNotificationPreferences(user.id),
  ]);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      {!vapid && (
        <p className="rounded-md border border-line bg-surface/60 px-4 py-3 text-sm text-text-2">
          {t("vapid_missing")}
        </p>
      )}
      <NotificationSettings
        isAdmin={user.role === "admin"}
        initialPreferences={prefs as Record<string, boolean>}
        vapidPublicKey={vapid}
      />
    </main>
  );
}
```

`views/profile-notifications/index.ts`:

```ts
export { ProfileNotificationsPage } from "./ui/profile-notifications-page";
```

- [ ] **Step 2: Page route**

`app/[locale]/profile/notifications/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { ProfileNotificationsPage } from "@/views/profile-notifications";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileNotificationsPage locale={locale} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add views/profile-notifications app/[locale]/profile/notifications
git commit -m "feat(profile): /profile/notifications page wired to the view"
```

### Task D6: i18n strings

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`, `messages/by.json`

- [ ] **Step 1: Add the namespace**

Append a top-level `"Notifications"` key to each JSON file with the shape below. For RU and BY, translate idiomatically — keep placeholders intact.

```json
"Notifications": {
  "page_title": "Notifications",
  "intro": "Get a heads-up when there's news on your bookings, VIP status, or testimonials. Browser notifications are off until you enable them; each category below opts in separately.",
  "enable_browser": "Enable browser notifications",
  "disable_browser": "Disable browser notifications",
  "unsupported": "This browser doesn't support push notifications.",
  "denied": "Browser notifications are blocked. Enable them in your site settings.",
  "vapid_missing": "Notification keys are not configured. Ask the admin to set VAPID_* env vars.",
  "offline_title": "You're offline",
  "offline_body": "Reconnect to keep browsing the atelier.",
  "profile_tile_title": "Notifications",
  "profile_tile_description": "Choose which updates you'd like to receive.",

  "category_booking_created_label": "New booking submitted (admin)",
  "category_booking_created_push_title": "New booking",
  "category_booking_created_push_body": "{customer} requested {service} on {date}",

  "category_booking_confirmed_label": "Booking confirmed",
  "category_booking_confirmed_push_title": "Booking confirmed",
  "category_booking_confirmed_push_body": "Your appointment on {date} is confirmed.",

  "category_booking_cancelled_label": "Booking cancelled",
  "category_booking_cancelled_push_title": "Booking cancelled",
  "category_booking_cancelled_push_body": "Your appointment on {date} was cancelled.",

  "category_booking_reminder_24h_label": "24-hour booking reminder",
  "category_booking_reminder_24h_push_title": "Tomorrow at {time}",
  "category_booking_reminder_24h_push_body": "Reminder: {service} at the atelier on {date}.",

  "category_vip_decision_label": "VIP request decision",
  "category_vip_decision_push_title": "VIP update",
  "category_vip_decision_push_body": "Your VIP request was {status}.",

  "category_vip_request_submitted_label": "New VIP request (admin)",
  "category_vip_request_submitted_push_title": "New VIP request",
  "category_vip_request_submitted_push_body": "{customer} requested VIP access.",

  "category_testimonial_decision_label": "Testimonial decision",
  "category_testimonial_decision_push_title": "Testimonial update",
  "category_testimonial_decision_push_body": "Your testimonial was {status}.",

  "category_testimonial_submitted_label": "New testimonial submitted (admin)",
  "category_testimonial_submitted_push_title": "New testimonial",
  "category_testimonial_submitted_push_body": "{customer} left a testimonial."
}
```

- [ ] **Step 2: Verify next-intl missing-key check**

Run: `npm test` — the Notifications block must parse without "MISSING_MESSAGE" warnings in any locale.

- [ ] **Step 3: Commit**

```bash
git add messages
git commit -m "feat(i18n): Notifications namespace across en/ru/by"
```

### Task D7: Profile entry tile

**Files:**
- Modify: `views/profile/ui/profile-page.tsx`

- [ ] **Step 1: Append tile**

Find the `QUICK_LINKS` array (top of file) and add an entry:

```ts
{ key: "notifications", href: "/profile/notifications" },
```

Add a matching `Profile.quick_links.notifications` string in each `messages/*.json` (under the existing `Profile.quick_links` block). Pull copy from `Notifications.profile_tile_title` if the existing markup uses a separate description key, mirror that.

- [ ] **Step 2: Visual check**

Run: `npm run dev`, sign in, visit `/en/profile`, confirm the new tile is present and clicking it lands on `/en/profile/notifications`.

- [ ] **Step 3: Commit**

```bash
git add views/profile/ui/profile-page.tsx messages
git commit -m "feat(profile): notifications quick-link tile"
```

---

## Phase E — Trigger wiring

Every task in this phase follows the same shape:
1. Import `dispatchNotification` from `@/shared/lib/notifications`.
2. After the existing DB write succeeds, `await dispatchNotification(...)` with the right user id + payload.
3. **Do not break the existing flow** — the dispatcher already swallows errors. Don't wrap the call in another try/catch.
4. Add or extend the existing action's test to assert the dispatcher is called with the expected arguments.

A small helper for the admin fan-out belongs in `db/users-admin.ts` already (check `listAdminIds()` — if missing, add the trivial helper in Task E1 below and reuse).

### Task E1: Admin-id helper

**Files:**
- Modify: `db/users-admin.ts` (only if `listAdminUserIds` doesn't already exist)
- Test: `db/users-admin.test.ts`

- [ ] **Step 1: Grep for existing**

Run: `grep -n "listAdminUserIds\|listAdminIds" db/`. If a function returning admin ids already exists, skip this task.

- [ ] **Step 2: Add helper**

```ts
// db/users-admin.ts (append)
export async function listAdminUserIds(): Promise<string[]> {
  if (!db) return [];
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"));
  return rows.map((r) => r.id);
}
```

- [ ] **Step 3: Test + commit**

```ts
// users-admin.test.ts (append)
describe("listAdminUserIds", () => {
  it("returns an array", async () => {
    expect(Array.isArray(await listAdminUserIds())).toBe(true);
  });
});
```

```
npx vitest run db/users-admin.test.ts                # PASS
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): listAdminUserIds helper for notification fan-out"
```

### Task E2: `booking_created` — customer submits

**File:** [views/booking/api/submit.ts](../../../views/booking/api/submit.ts)

- [ ] **Step 1: Insert dispatch after `setBookingGcalEventId`** (or after the booking row is confirmed valid — i.e. right after `if (!booking) return { ok: false, error: "db_unavailable" };` and **before** the final `redirect(...)`).

```ts
import { dispatchNotification } from "@/shared/lib/notifications";
import { listAdminUserIds } from "@/db/users-admin";
// ...
const adminIds = await listAdminUserIds();
for (const adminId of adminIds) {
  await dispatchNotification(adminId, "booking_created", {
    titleKey: "category_booking_created_push_title",
    bodyKey: "category_booking_created_push_body",
    bodyParams: {
      customer: session.user.name ?? session.user.id,
      service: localizedServiceName(service, input.locale),
      date: scheduledFor.toISOString(),
    },
    url: "/admin/bookings",
    meta: { bookingId: booking.id },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add views/booking/api/submit.ts
git commit -m "feat(notifications): admin booking_created on new booking"
```

### Task E3: `booking_confirmed` + `booking_cancelled` (admin path)

**File:** [features/bookings-admin/api/actions.ts](../../../features/bookings-admin/api/actions.ts)

- [ ] **Step 1: Wire the confirm path**

After `await setBookingStatus(bookingId, "confirmed");` in `confirmBooking`, look up the booking (`getBookingById`) and dispatch:

```ts
const booking = await getBookingById(bookingId);
if (booking) {
  await dispatchNotification(booking.userId, "booking_confirmed", {
    titleKey: "category_booking_confirmed_push_title",
    bodyKey: "category_booking_confirmed_push_body",
    bodyParams: { date: booking.scheduledFor.toISOString() },
    url: "/profile",
    meta: { bookingId },
  });
}
```

- [ ] **Step 2: Wire the decline path**

After `await setBookingStatus(bookingId, "cancelled");` in `declineBooking`:

```ts
await dispatchNotification(booking.userId, "booking_cancelled", {
  titleKey: "category_booking_cancelled_push_title",
  bodyKey: "category_booking_cancelled_push_body",
  bodyParams: { date: booking.scheduledFor.toISOString() },
  url: "/profile",
  meta: { bookingId },
});
```

- [ ] **Step 3: Commit**

```bash
git add features/bookings-admin/api/actions.ts
git commit -m "feat(notifications): customer booking_confirmed + booking_cancelled (admin path)"
```

### Task E4: `booking_cancelled` — self-cancel

**File:** [features/booking-cancel/api/cancel-booking-action.ts](../../../features/booking-cancel/api/cancel-booking-action.ts)

- [ ] **Step 1: Dispatch after `cancelBookingIfOpen` succeeds**

After `if (!cancelled) return ...;`:

```ts
// Even though the customer initiated the cancel, surfacing it back to
// their other devices is intentional — the booking pages on other
// tabs should refresh, and the user gets a confirmation push.
await dispatchNotification(user.id, "booking_cancelled", {
  titleKey: "category_booking_cancelled_push_title",
  bodyKey: "category_booking_cancelled_push_body",
  bodyParams: { date: cancelled.scheduledFor.toISOString() },
  url: "/profile",
  meta: { bookingId: cancelled.id },
});
```

- [ ] **Step 2: Commit**

```bash
git add features/booking-cancel/api/cancel-booking-action.ts
git commit -m "feat(notifications): booking_cancelled on self-cancel"
```

### Task E5: `vip_request_submitted` (admin)

**File:** [features/vip-request-submit/api/actions.ts](../../../features/vip-request-submit/api/actions.ts)

- [ ] **Step 1: Dispatch after `createVipRequest`**

Right before `return { ok: true, id: row.id };`:

```ts
const adminIds = await listAdminUserIds();
for (const adminId of adminIds) {
  await dispatchNotification(adminId, "vip_request_submitted", {
    titleKey: "category_vip_request_submitted_push_title",
    bodyKey: "category_vip_request_submitted_push_body",
    bodyParams: { customer: session.user.name ?? session.user.id },
    url: "/admin/vip-requests",
    meta: { vipRequestId: row.id },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add features/vip-request-submit/api/actions.ts
git commit -m "feat(notifications): admin vip_request_submitted on new VIP request"
```

### Task E6: `vip_decision` (customer)

**File:** [features/vip-requests-admin/api/actions.ts](../../../features/vip-requests-admin/api/actions.ts)

- [ ] **Step 1: Dispatch in approve + decline + downgrade**

After each successful `decideVipRequest`/`downgradeVipRequest`, send to `row.userId`:

```ts
await dispatchNotification(row.userId, "vip_decision", {
  titleKey: "category_vip_decision_push_title",
  bodyKey: "category_vip_decision_push_body",
  bodyParams: { status: row.status },
  url: "/membership",
  meta: { vipRequestId: row.id },
});
```

- [ ] **Step 2: Commit**

```bash
git add features/vip-requests-admin/api/actions.ts
git commit -m "feat(notifications): vip_decision on approve/decline/downgrade"
```

### Task E7: `testimonial_submitted` (admin)

**File:** [features/testimonial-submit/api/submit-testimonial-action.ts](../../../features/testimonial-submit/api/submit-testimonial-action.ts) + [features/testimonial-submit/api/change-request-actions.ts](../../../features/testimonial-submit/api/change-request-actions.ts)

- [ ] **Step 1: After `createTestimonial` succeeds** (just before `return { ok: true, id: result.row.id };`):

```ts
const adminIds = await listAdminUserIds();
for (const adminId of adminIds) {
  await dispatchNotification(adminId, "testimonial_submitted", {
    titleKey: "category_testimonial_submitted_push_title",
    bodyKey: "category_testimonial_submitted_push_body",
    bodyParams: { customer: user.firstName ?? user.id },
    url: "/admin/testimonials",
    meta: { testimonialId: result.row.id, kind: "new" },
  });
}
```

- [ ] **Step 2: Same fan-out in `requestTestimonialEditAction` and `requestTestimonialRemovalAction`** — same payload, different `meta.kind` (`"edit"` / `"removal"`).

- [ ] **Step 3: Commit**

```bash
git add features/testimonial-submit/api
git commit -m "feat(notifications): admin testimonial_submitted on new + change requests"
```

### Task E8: `testimonial_decision` (customer)

**File:** [features/testimonials-admin/api/actions.ts](../../../features/testimonials-admin/api/actions.ts)

- [ ] **Step 1: In `approveTestimonial` + `rejectTestimonial` + edit/removal resolvers**, dispatch to `row.userId`:

```ts
await dispatchNotification(row.userId, "testimonial_decision", {
  titleKey: "category_testimonial_decision_push_title",
  bodyKey: "category_testimonial_decision_push_body",
  bodyParams: { status: row.status },
  url: "/profile",
  meta: { testimonialId: row.id },
});
```

- [ ] **Step 2: Commit**

```bash
git add features/testimonials-admin/api/actions.ts
git commit -m "feat(notifications): testimonial_decision on moderation actions"
```

---

## Phase F — Cron + reminder

### Task F1: Booking reminder cron

**Files:**
- Create: `app/api/cron/booking-reminders/route.ts` + `.test.ts`
- Create: `db/bookings-reminder.ts` (or extend `db/bookings.ts`) + test
- Create: `vercel.json`

- [ ] **Step 1: DB query helper**

Add to `db/bookings.ts`:

```ts
/** Confirmed bookings whose scheduled_for is in [now+23h, now+25h]. */
export async function listBookingsDueForReminder(): Promise<schema.Booking[]> {
  if (!db) return [];
  return db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        sql`${schema.bookings.scheduledFor} BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'`,
      ),
    );
}
```

- [ ] **Step 2: Route**

`app/api/cron/booking-reminders/route.ts`:

```ts
import { NextResponse } from "next/server";
import { listBookingsDueForReminder } from "@/db/bookings";
import { getServiceById } from "@/db/services";
import { hasRecentBookingReminder } from "@/db/notification-log";
import { dispatchNotification } from "@/shared/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = req.headers.get("authorization") ?? "";
  return got === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });

  const bookings = await listBookingsDueForReminder();
  let sent = 0;
  for (const b of bookings) {
    if (await hasRecentBookingReminder(b.id)) continue;
    // Resolve the service name so the push body reads like a sentence
    // instead of "Reminder: svc_abc123...". `getServiceById` may return
    // null if a service was archived after the booking — fall back to a
    // generic copy in that case.
    const service = await getServiceById(b.serviceId);
    const serviceName = service?.nameEn ?? "your appointment";
    await dispatchNotification(b.userId, "booking_reminder_24h", {
      titleKey: "category_booking_reminder_24h_push_title",
      bodyKey: "category_booking_reminder_24h_push_body",
      bodyParams: {
        date: b.scheduledFor.toISOString(),
        time: b.scheduledFor.toISOString(),
        service: serviceName,
      },
      url: "/profile",
      meta: { bookingId: b.id },
    });
    sent += 1;
  }
  return NextResponse.json({ examined: bookings.length, sent });
}
```

- [ ] **Step 3: vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron/booking-reminders", "schedule": "0 * * * *" }
  ]
}
```

- [ ] **Step 4: Route test**

`app/api/cron/booking-reminders/route.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/bookings", () => ({ listBookingsDueForReminder: vi.fn(async () => []) }));
vi.mock("@/db/notification-log", () => ({ hasRecentBookingReminder: vi.fn() }));
vi.mock("@/shared/lib/notifications", () => ({ dispatchNotification: vi.fn() }));

describe("GET /api/cron/booking-reminders", () => {
  it("401 in prod without bearer", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "shh";
    const { GET } = await import("./route");
    const res = await GET(new Request("http://x"));
    expect(res.status).toBe(401);
    process.env.NODE_ENV = prev;
  });

  it("allows unauthenticated in dev", async () => {
    process.env.NODE_ENV = "development";
    const { GET } = await import("./route");
    const res = await GET(new Request("http://x"));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 5: Run + commit**

```
npx vitest run app/api/cron/booking-reminders/route.test.ts        # PASS
git add app/api/cron/booking-reminders vercel.json db/bookings.ts
git commit -m "feat(cron): hourly booking_reminder_24h dispatcher"
```

---

## Phase G — Locale capture

### Task G1: Capture in `auth.ts`

**File:** [auth.ts](../../../auth.ts), [db/users.ts](../../../db/users.ts), [db/google-users.ts](../../../db/google-users.ts)

- [ ] **Step 1: Extend the upsert helpers**

In `db/users.ts` (and `db/google-users.ts`) extend the payload interface and the `INSERT/UPDATE` to accept an optional `preferredLocale: string | null`. Default to `'en'` on insert; on update, only overwrite when non-null. Mirror the existing structure exactly — don't restructure.

- [ ] **Step 2: Pass locale through `auth.ts`**

In the Telegram `authorize` and the Google `signIn` callback, read the URL locale from `cookies().get('NEXT_LOCALE')` (next-intl writes this on every locale switch). Pass it through.

- [ ] **Step 3: Tests for the new column path**

Append to `db/users.test.ts` (or matching test file) one test asserting that an explicit locale is written and an absent locale leaves the default `'en'`.

- [ ] **Step 4: Commit**

```bash
git add auth.ts db/users.ts db/google-users.ts db/users.test.ts
git commit -m "feat(auth): capture preferred_locale on sign-in"
```

### Task G2: Capture in the locale switcher

**Files:**
- Create: `features/locale-switcher/api/save-locale.ts` + `.test.ts`
- Modify: `features/locale-switcher/index.ts`, `features/locale-switcher/ui/locale-switcher.tsx`

- [ ] **Step 1: Action**

```ts
"use server";

import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { setUserPreferredLocale } from "@/db/users";
import { routing } from "@/i18n/routing";

export async function saveLocalePreferenceAction(
  locale: string,
): Promise<{ ok: boolean }> {
  if (!routing.locales.includes(locale as never)) return { ok: false };
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false };
  await setUserPreferredLocale(user.id, locale);
  return { ok: true };
}
```

Add the matching `setUserPreferredLocale` to `db/users.ts`.

- [ ] **Step 2: Re-export from slice public API**

`features/locale-switcher/index.ts`: add the export.

- [ ] **Step 3: Wire into the switch handler**

In `features/locale-switcher/ui/locale-switcher.tsx`, after `router.replace(pathname, { locale: l })`, fire-and-forget the action (don't `await` inside `startTransition`):

```tsx
void saveLocalePreferenceAction(l);
```

- [ ] **Step 4: Test + commit**

```
npx vitest run features/locale-switcher       # PASS (covers existing tests too)
git add features/locale-switcher db/users.ts
git commit -m "feat(locale): persist preferred_locale on switch"
```

---

## Phase H — Verification + PR

### Task H1: Settings page e2e

**Files:**
- Create: `e2e/notifications-settings.spec.ts`

- [ ] **Step 1: Authoring**

Use the existing Telegram-mock helper if present (`grep -n "signIn\|telegram_mock" e2e/`). If no helper exists, hit the page anonymously and assert the redirect to `/sign-in` — that's enough to lock the route in.

```ts
import { test, expect } from "@playwright/test";

test("anonymous visit to /en/profile/notifications redirects to sign-in", async ({ page }) => {
  await page.goto("/en/profile/notifications");
  await expect(page).toHaveURL(/\/sign-in/);
});
```

- [ ] **Step 2: Run + commit**

```
npx playwright test e2e/notifications-settings.spec.ts       # PASS
git add e2e/notifications-settings.spec.ts
git commit -m "test(e2e): notifications settings route guard"
```

### Task H2: Full verification sweep

Use [verification-before-completion](https://anthropic.com) — i.e. **run the verifier commands and quote their actual output**, do not infer success.

- [ ] **Step 1: Lint**

```
npm run lint            # expect: no warnings, no errors
```

- [ ] **Step 2: Vitest**

```
npm test                # all green
```

- [ ] **Step 3: Build**

```
npm run build           # builds, and emits public/sw.js
ls -la public/sw.js     # confirm it exists
```

- [ ] **Step 4: Playwright (manifest + new spec)**

```
npm run e2e             # all green
```

- [ ] **Step 5: Manual smoke**

`npm run dev`, log in via Telegram in Chrome:
- Visit `/en/profile/notifications`. Toggle one customer category (e.g. `booking_confirmed`). Click "Enable browser notifications". Permission prompt appears; accept. Verify `notification_settings` row + `push_subscriptions` row in Supabase.
- From the admin panel, confirm a pending booking belonging to the same user. Push notification appears within a few seconds.
- Click the notification → opens `/en/profile`.

Document the result inline in the PR description.

### Task H3: Open the PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/pwa-and-notifications
```

- [ ] **Step 2: Use the pr-description skill to compose the body**

See [.claude/skills/pr-description/SKILL.md](../../../.claude/skills/pr-description/SKILL.md).

Suggested title: `feat: installable PWA + opt-in push notifications`

Body must mention:
- Default-off semantics (key requirement).
- 8 notification categories, both audiences.
- New env vars (VAPID + CRON_SECRET) — admin needs to set these on Vercel before push delivery works.
- Manual smoke test result from Task H2 Step 5.
- Outstanding follow-ups: PNG icon polish, per-device unsubscribe UI.

- [ ] **Step 3: Verify PR URL appears, paste it into the assistant output**

---

## Done criteria

- [ ] All checkboxes above are ticked.
- [ ] `npm run lint && npm test && npm run build && npm run e2e` is green.
- [ ] `public/sw.js` exists after build.
- [ ] Default-off semantics verified: a freshly signed-in user with no preference row gets `notification_log.status='skipped_prefs'` for any dispatch.
- [ ] PR opened, URL shared with the user.
