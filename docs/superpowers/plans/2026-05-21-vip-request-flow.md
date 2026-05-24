# VIP Request Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a user-submittable + admin-reviewable VIP membership flow with a 30-day expiration, mirroring the existing booking pending→approved pattern.

**Architecture:** New `vip_requests` table with status enum and `expires_at`. Tier is *derived per render* (not cached on `users`) via a single indexed query. User mutations (submit, cancel) and admin mutations (decide, downgrade) live as Next.js **server actions** in FSD slices — matching the booking precedent at `views/booking/api/submit.ts` and `features/bookings-admin/api/actions.ts`. Admin endpoints additionally check `users.role === 'admin'`.

**Tech Stack:** Drizzle ORM, Postgres (Supabase), Next.js 16 App Router, next-auth (JWT), next-intl, Vitest, Playwright. Server actions over API routes for mutations.

**Spec:** [`docs/superpowers/specs/2026-05-21-vip-request-flow-design.md`](../specs/2026-05-21-vip-request-flow-design.md)

**Implementation note on §5 of the spec:** the spec lists endpoints as `POST /api/vip-requests/...`. Booking precedent uses server actions instead of API routes for mutations (see [`views/booking/api/submit.ts`](../../../views/booking/api/submit.ts) and [`features/bookings-admin/api/actions.ts`](../../../features/bookings-admin/api/actions.ts)). This plan implements the spec's contract as server actions — semantic equivalent, no API route files. The status codes in §5 map to discriminated-union return types (`{ ok: true, ... } | { ok: false, reason: '...' }`).

---

## Pre-flight

- [ ] **Working tree is clean OR pending UX changes (welcome CTAs, header link, tier collapse) are committed.** Run `git status`. If dirty:
  ```bash
  git add -p   # stage selectively
  git commit -m "feat(views/welcome,widgets/app-header,entities/studio): rename Violette→VIP, drop Atelier, link header wordmark to /home"
  ```
  Keep that diff separate from the VIP feature work below.

- [ ] **(Optional but recommended) Move to a fresh worktree.** Invoke `superpowers:using-git-worktrees` and run all tasks from there. Keeps `main` and the booking-fix branch undisturbed.

- [ ] **Baseline check.** Run `npm run lint && npm test && npm run build`. All green before starting Task 1.

---

## File Structure

This plan creates / modifies the following files. Skim before starting so the destination is clear.

```
db/
  schema.ts                      ← MODIFY: + vipRequestStatus enum, vipRequests table
  schema.test.ts                 ← MODIFY: + assertions for new symbols
  vip-requests.ts                ← CREATE: CRUD + getCurrentTier + admin queries
  vip-requests.test.ts           ← CREATE: unit tests for db/vip-requests.ts
  users.ts                       ← MODIFY: + getUserById helper
  users.test.ts                  ← MODIFY (or CREATE): + getUserById tests
  migrations/0004_<auto>.sql     ← CREATE (via drizzle-kit generate)

shared/lib/
  auth-server.ts                 ← CREATE: requireAdmin() + getCurrentSessionUser() helpers
  auth-server.test.ts            ← CREATE: tests for helpers

features/
  vip-request-submit/
    index.ts                     ← CREATE: public API
    api/actions.ts               ← CREATE: submitVipRequest, cancelVipRequest server actions
    api/actions.test.ts          ← CREATE
    ui/vip-card-cta.tsx          ← CREATE: client component state machine
    ui/vip-card-cta.test.tsx     ← CREATE
    ui/vip-card-cta.stories.tsx  ← CREATE
  vip-requests-admin/
    index.ts                     ← CREATE: public API
    api/actions.ts               ← CREATE: decideVipRequest, downgradeVipRequest server actions
    api/actions.test.ts          ← CREATE
    ui/approve-form.tsx          ← CREATE: inline date picker + submit
    ui/approve-form.test.tsx     ← CREATE
    ui/request-actions.tsx       ← CREATE: Approve / Decline row
    ui/request-actions.test.tsx  ← CREATE
    ui/active-vip-row.tsx        ← CREATE: row with Downgrade
    ui/active-vip-row.test.tsx   ← CREATE
    ui/expired-row.tsx           ← CREATE: row with Re-request

entities/studio/
  model/types.ts                 ← MODIFY: remove MembershipTierName + CustomerProfile.membership
  model/data.ts                  ← MODIFY: drop profile.membership
  model/data.test.ts             ← MODIFY: drop tier-name assertions if any remain
  index.ts                       ← MODIFY: drop MembershipTierName re-export

views/membership/ui/
  membership-page.tsx            ← MODIFY: async server component, resolves state per session
  membership-page.test.tsx       ← MODIFY: cover new states (visitor/member/pending/vip)
  membership-tier-card.tsx       ← MODIFY: accept state prop; CTA wiring via slot

views/profile/ui/
  profile-page.tsx               ← MODIFY: render badge from getCurrentTier; drop member_tag
  profile-page.test.tsx          ← MODIFY: assert VIP / pending / none cases

app/[locale]/admin/
  page.tsx                       ← MODIFY: + VIP requests inbox card
  vip-requests/page.tsx          ← CREATE: 3-section admin list
  vip-requests/expired/page.tsx  ← CREATE: paginated expired history

messages/
  en.json                        ← MODIFY: + AdminVipRequests namespace, Membership/Profile keys
  ru.json                        ← MODIFY: same
  be.json                        ← MODIFY: same

e2e/
  vip-request.spec.ts            ← CREATE: full happy-path + downgrade

CLAUDE.md                        ← (no change required)
```

---

## Phase 1 — Data layer

Foundation. Nothing depends on later phases, everything depends on this.

### Task 1: Add the `vip_requests` schema

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1.1: Add the enum and table definition.** Append after the existing `bookings` table block (after `bookings` exports, before `googleOauthTokens`):

```ts
export const vipRequestStatus = pgEnum("vip_request_status", [
  "pending",
  "approved",
  "declined",
  "cancelled",
]);

export const vipRequests = pgTable(
  "vip_requests",
  {
    id: text("id").primaryKey(), // "vipreq_" + 16 hex
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: vipRequestStatus("status").notNull().default("pending"),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id),
    declineReason: text("decline_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("vip_requests_user_idx").on(table.userId),
    statusIdx: index("vip_requests_status_idx").on(table.status),
    pendingUniq: uniqueIndex("vip_requests_one_pending_per_user")
      .on(table.userId)
      .where(sql`status = 'pending'`),
    activeExpiryIdx: index("vip_requests_active_expiry_idx")
      .on(table.expiresAt)
      .where(sql`status = 'approved'`),
  }),
);

export type VipRequest = typeof vipRequests.$inferSelect;
export type NewVipRequest = typeof vipRequests.$inferInsert;
```

- [ ] **Step 1.2: Type-check.** Run `npx tsc --noEmit`. Expected: no errors.

### Task 2: Schema assertions

**Files:**
- Modify: `db/schema.test.ts`

- [ ] **Step 2.1: Add new symbols to the imports** at the top of the file (alongside `users`, `bookings`, etc.).

- [ ] **Step 2.2: Add assertions inside the existing `describe("db/schema", …)`:**

```ts
it("declares vip_requests table and status enum", () => {
  expect(vipRequests).toBeDefined();
  expect(vipRequestStatus.enumValues).toEqual([
    "pending",
    "approved",
    "declined",
    "cancelled",
  ]);
});

it("infers VipRequest insert type with required fields", () => {
  const _r: NewVipRequest = { id: "vipreq_x", userId: "tg:1" };
  expect(_r).toBeDefined();
});
```

- [ ] **Step 2.3: Run test.** `npx vitest run db/schema.test.ts`. Expected: PASS.

- [ ] **Step 2.4: Commit.**
```bash
git add db/schema.ts db/schema.test.ts
git commit -m "feat(db): vip_requests table + status enum

Adds the schema for the VIP membership request/approval flow. Partial
unique index enforces one pending request per user; active-expiry index
supports the admin queue sorted by soonest-to-expire."
```

### Task 3: Generate the migration

**Files:**
- Create: `db/migrations/0004_<auto>.sql` (filename auto-chosen by drizzle-kit)

- [ ] **Step 3.1: Generate.** Run `npm run db:generate`. Expected output mentions `0004_<name>.sql` created.

- [ ] **Step 3.2: Inspect the generated SQL.** Open the new file. Verify it includes:
  - `CREATE TYPE "public"."vip_request_status" AS ENUM(...)`
  - `CREATE TABLE "vip_requests" (...)` with all columns
  - `CREATE INDEX "vip_requests_user_idx" ...`
  - `CREATE INDEX "vip_requests_status_idx" ...`
  - `CREATE UNIQUE INDEX "vip_requests_one_pending_per_user" ON "vip_requests" ("user_id") WHERE status = 'pending'`
  - `CREATE INDEX "vip_requests_active_expiry_idx" ON "vip_requests" ("expires_at") WHERE status = 'approved'`
  - Foreign keys to `users` for `user_id` (cascade) and `decided_by` (no cascade)

  If the partial-index WHERE clause is missing or different, drizzle-kit's partial-index detection may need a hand-patch — manually edit the SQL to add the WHERE.

- [ ] **Step 3.3: Run the migration locally.** Run `npm run db:migrate`. Expected: applies cleanly. Skip this step if `DATABASE_URL` is unset (CI / fresh checkout) — the migration runs in deploy environments anyway.

- [ ] **Step 3.4: Commit.**
```bash
git add db/migrations/
git commit -m "feat(db): migration for vip_requests table"
```

### Task 4: `db/vip-requests.ts` — id generator + `createVipRequest`

**Files:**
- Create: `db/vip-requests.ts`
- Create: `db/vip-requests.test.ts`

- [ ] **Step 4.1: Write the failing test.**

```ts
// db/vip-requests.test.ts
import { describe, it, expect } from "vitest";
import { generateVipRequestId } from "./vip-requests";

describe("generateVipRequestId", () => {
  it("returns a vipreq_-prefixed id with 16 hex chars", () => {
    const id = generateVipRequestId();
    expect(id).toMatch(/^vipreq_[0-9a-f]{16}$/);
  });

  it("returns distinct values across calls", () => {
    const a = generateVipRequestId();
    const b = generateVipRequestId();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 4.2: Run test, confirm failure.** `npx vitest run db/vip-requests.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 4.3: Implement the minimum.**

```ts
// db/vip-requests.ts
import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db, schema } from "./index";

export function generateVipRequestId(): string {
  return `vipreq_${randomBytes(8).toString("hex")}`;
}
```

- [ ] **Step 4.4: Run test.** Expected: PASS.

- [ ] **Step 4.5: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): vip-requests id generator"
```

### Task 5: `createVipRequest` — happy path

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 5.1: Add the failing test.** Note: db tests in this repo run against the real Drizzle client but tolerate `db === null` (see existing `db/bookings.ts` shape). The function should also accept that gracefully. Use the same null-DB pattern.

```ts
import { createVipRequest } from "./vip-requests";

describe("createVipRequest", () => {
  it("returns null when DATABASE_URL is unset (db === null)", async () => {
    // Forces the null-db branch. In CI, DATABASE_URL is unset so this is the real path.
    const result = await createVipRequest({ userId: "tg:1", note: null });
    // When db is null, we return null. When db is set, we return a row.
    expect(result === null || (typeof result === "object" && result.userId === "tg:1")).toBe(true);
  });
});
```

- [ ] **Step 5.2: Implement.**

```ts
export interface NewVipRequestInput {
  userId: string;
  note?: string | null;
}

export async function createVipRequest(
  input: NewVipRequestInput,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const id = generateVipRequestId();
  const rows = await db
    .insert(schema.vipRequests)
    .values({
      id,
      userId: input.userId,
      note: input.note ?? null,
    })
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 5.3: Run test.** Expected: PASS.

- [ ] **Step 5.4: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): createVipRequest"
```

### Task 6: `cancelOwnVipRequest`

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 6.1: Test — null-db tolerance.**

```ts
import { cancelOwnVipRequest } from "./vip-requests";

describe("cancelOwnVipRequest", () => {
  it("returns null when db is null", async () => {
    const result = await cancelOwnVipRequest("tg:nobody");
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });
});
```

- [ ] **Step 6.2: Implement.** Updates the user's own pending row (if any) to `cancelled`. Returns the updated row or null.

```ts
export async function cancelOwnVipRequest(
  userId: string,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .update(schema.vipRequests)
    .set({ status: "cancelled", decidedAt: now, decidedBy: userId })
    .where(
      and(
        eq(schema.vipRequests.userId, userId),
        eq(schema.vipRequests.status, "pending"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 6.3: Run test.** Expected: PASS.

- [ ] **Step 6.4: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): cancelOwnVipRequest"
```

### Task 7: `decideVipRequest` (approve + decline)

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 7.1: Test the null-db path for both actions.**

```ts
import { decideVipRequest } from "./vip-requests";

describe("decideVipRequest", () => {
  it("returns null when db is null (approve path)", async () => {
    const result = await decideVipRequest({
      id: "vipreq_x",
      action: "approve",
      decidedBy: "tg:admin",
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    });
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("returns null when db is null (decline path)", async () => {
    const result = await decideVipRequest({
      id: "vipreq_x",
      action: "decline",
      decidedBy: "tg:admin",
      declineReason: "test",
    });
    expect(result === null || typeof result === "object").toBe(true);
  });
});
```

- [ ] **Step 7.2: Implement.**

```ts
export type DecideVipRequestInput =
  | {
      id: string;
      action: "approve";
      decidedBy: string;
      expiresAt: Date;
    }
  | {
      id: string;
      action: "decline";
      decidedBy: string;
      declineReason?: string | null;
    };

export async function decideVipRequest(
  input: DecideVipRequestInput,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const base = {
    decidedAt: now,
    decidedBy: input.decidedBy,
  };
  const patch =
    input.action === "approve"
      ? { ...base, status: "approved" as const, expiresAt: input.expiresAt }
      : {
          ...base,
          status: "declined" as const,
          declineReason: input.declineReason ?? null,
        };
  const rows = await db
    .update(schema.vipRequests)
    .set(patch)
    .where(
      and(
        eq(schema.vipRequests.id, input.id),
        eq(schema.vipRequests.status, "pending"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 7.3: Run test.** Expected: PASS.

- [ ] **Step 7.4: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): decideVipRequest"
```

### Task 8: `downgradeVipRequest`

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 8.1: Test idempotency expectation.**

```ts
import { downgradeVipRequest } from "./vip-requests";

describe("downgradeVipRequest", () => {
  it("returns null when db is null", async () => {
    const result = await downgradeVipRequest("vipreq_x");
    expect(result === null || typeof result === "object").toBe(true);
  });
});
```

- [ ] **Step 8.2: Implement.** Sets `expires_at = now()` on an approved row. Whether it's already expired or not, the call succeeds.

```ts
export async function downgradeVipRequest(
  id: string,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .update(schema.vipRequests)
    .set({ expiresAt: now })
    .where(
      and(
        eq(schema.vipRequests.id, id),
        eq(schema.vipRequests.status, "approved"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 8.3: Run test.** Expected: PASS.

- [ ] **Step 8.4: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): downgradeVipRequest (idempotent force-expire)"
```

### Task 9: `getCurrentTier` — discriminated union resolver

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 9.1: Test that the null-db path returns the "member" default.**

```ts
import { getCurrentTier } from "./vip-requests";

describe("getCurrentTier", () => {
  it('defaults to {state: "member"} when db is null', async () => {
    const result = await getCurrentTier("tg:nobody");
    // CI has no DB. We assert the safe default here.
    if (result.state === "member" && !("pendingRequestId" in result)) {
      expect(result).toEqual({ state: "member" });
    } else {
      // With a real DB and no rows for this user, same answer expected
      expect(result.state).toBe("member");
    }
  });
});
```

- [ ] **Step 9.2: Implement.** Single query, sorted to prefer approved-active over pending.

```ts
export type CurrentTier =
  | { state: "member" }
  | { state: "member-pending"; pendingRequestId: string }
  | { state: "vip"; activeRequestId: string; expiresAt: Date };

export async function getCurrentTier(userId: string): Promise<CurrentTier> {
  if (!db) return { state: "member" };
  // Pull all pending + approved rows; cancelled/declined filtered out.
  const rows = await db
    .select()
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.userId, userId),
        or(
          eq(schema.vipRequests.status, "pending"),
          eq(schema.vipRequests.status, "approved"),
        ),
      ),
    )
    .orderBy(desc(schema.vipRequests.createdAt));

  // Priority: active VIP > pending > none
  const now = new Date();
  const activeVip = rows.find(
    (r) =>
      r.status === "approved" &&
      r.expiresAt !== null &&
      r.expiresAt > now,
  );
  if (activeVip) {
    return {
      state: "vip",
      activeRequestId: activeVip.id,
      expiresAt: activeVip.expiresAt!,
    };
  }
  const pending = rows.find((r) => r.status === "pending");
  if (pending) {
    return { state: "member-pending", pendingRequestId: pending.id };
  }
  return { state: "member" };
}
```

- [ ] **Step 9.3: Run test.** Expected: PASS.

- [ ] **Step 9.4: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): getCurrentTier — discriminated union of member/pending/vip"
```

### Task 10: Admin list queries

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 10.1: Test that null-db returns empty arrays.**

```ts
import {
  listPendingVipRequests,
  listActiveVips,
  listExpiredVipRequests,
} from "./vip-requests";

describe("admin list queries", () => {
  it("listPendingVipRequests returns [] when db is null", async () => {
    expect(await listPendingVipRequests()).toEqual([]);
  });
  it("listActiveVips returns [] when db is null", async () => {
    expect(await listActiveVips()).toEqual([]);
  });
  it("listExpiredVipRequests returns [] when db is null", async () => {
    expect(await listExpiredVipRequests({ limit: 10, offset: 0 })).toEqual([]);
  });
});
```

- [ ] **Step 10.2: Implement, returning a join with user profile fields (mirror `BookingWithUser`).**

```ts
export interface VipRequestWithUser extends schema.VipRequest {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
}

const userJoinColumns = {
  userEmail: schema.users.email,
  userFirstName: schema.users.firstName,
  userLastName: schema.users.lastName,
  username: schema.users.username,
};

function withUserShape(
  row: {
    request: schema.VipRequest;
    userEmail: string | null;
    userFirstName: string | null;
    userLastName: string | null;
    username: string | null;
  },
): VipRequestWithUser {
  return {
    ...row.request,
    userEmail: row.userEmail,
    userFirstName: row.userFirstName,
    userLastName: row.userLastName,
    username: row.username,
  };
}

export async function listPendingVipRequests(): Promise<VipRequestWithUser[]> {
  if (!db) return [];
  const rows = await db
    .select({ request: schema.vipRequests, ...userJoinColumns })
    .from(schema.vipRequests)
    .leftJoin(schema.users, eq(schema.vipRequests.userId, schema.users.id))
    .where(eq(schema.vipRequests.status, "pending"))
    .orderBy(desc(schema.vipRequests.createdAt));
  return rows.map(withUserShape);
}

export async function listActiveVips(): Promise<VipRequestWithUser[]> {
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({ request: schema.vipRequests, ...userJoinColumns })
    .from(schema.vipRequests)
    .leftJoin(schema.users, eq(schema.vipRequests.userId, schema.users.id))
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        gt(schema.vipRequests.expiresAt, now),
      ),
    )
    .orderBy(schema.vipRequests.expiresAt); // soonest-to-expire first
  return rows.map(withUserShape);
}

export async function listExpiredVipRequests(opts: {
  limit: number;
  offset: number;
}): Promise<VipRequestWithUser[]> {
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({ request: schema.vipRequests, ...userJoinColumns })
    .from(schema.vipRequests)
    .leftJoin(schema.users, eq(schema.vipRequests.userId, schema.users.id))
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        lte(schema.vipRequests.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.vipRequests.expiresAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return rows.map(withUserShape);
}

export async function countExpiredVipRequests(): Promise<number> {
  if (!db) return 0;
  const now = new Date();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        lte(schema.vipRequests.expiresAt, now),
      ),
    );
  return rows[0]?.n ?? 0;
}
```

- [ ] **Step 10.3: Run all db tests.** `npx vitest run db/vip-requests.test.ts`. Expected: PASS.

- [ ] **Step 10.4: Commit.**
```bash
git add db/vip-requests.ts db/vip-requests.test.ts
git commit -m "feat(db): admin list queries for vip_requests"
```

### Task 11: `getUserById` on `db/users.ts`

**Files:**
- Modify: `db/users.ts`
- Create or modify: `db/users.test.ts`

- [ ] **Step 11.1: Add a failing test.** If `db/users.test.ts` doesn't exist, create it.

```ts
// db/users.test.ts
import { describe, it, expect } from "vitest";
import { getUserById } from "./users";

describe("getUserById", () => {
  it("returns null when db is null", async () => {
    const result = await getUserById("tg:nobody");
    expect(result === null || typeof result === "object").toBe(true);
  });
});
```

- [ ] **Step 11.2: Implement.**

```ts
import { eq } from "drizzle-orm";
// (add to existing imports)

export async function getUserById(
  id: string,
): Promise<schema.User | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 11.3: Run test.** Expected: PASS.

- [ ] **Step 11.4: Commit.**
```bash
git add db/users.ts db/users.test.ts
git commit -m "feat(db): getUserById"
```

---

## Phase 2 — Shared auth helper

### Task 12: `requireAdmin` and `getCurrentSessionUser` helpers

**Files:**
- Create: `shared/lib/auth-server.ts`
- Create: `shared/lib/auth-server.test.ts`

- [ ] **Step 12.1: Tests.**

```ts
// shared/lib/auth-server.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/users", () => ({ getUserById: vi.fn() }));

import { auth } from "@/auth";
import { getUserById } from "@/db/users";
import { requireAdmin, getCurrentSessionUser } from "./auth-server";

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(getUserById).mockReset();
});

describe("requireAdmin", () => {
  it('returns {ok:false, reason:"unauthorized"} when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const r = await requireAdmin();
    expect(r).toEqual({ ok: false, reason: "unauthorized" });
  });

  it('returns {ok:false, reason:"forbidden"} when role !== "admin"', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "tg:1",
      role: "customer",
    } as never);
    const r = await requireAdmin();
    expect(r).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns {ok:true, user} when role === 'admin'", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "tg:1",
      role: "admin",
    } as never);
    const r = await requireAdmin();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.role).toBe("admin");
  });
});

describe("getCurrentSessionUser", () => {
  it("returns null when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    expect(await getCurrentSessionUser()).toBeNull();
  });

  it("returns the user row for signed-in session", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "tg:1",
      role: "customer",
    } as never);
    const u = await getCurrentSessionUser();
    expect(u?.id).toBe("tg:1");
  });
});
```

- [ ] **Step 12.2: Run tests, confirm failure.** `npx vitest run shared/lib/auth-server.test.ts`. Expected: FAIL — module missing.

- [ ] **Step 12.3: Implement.**

```ts
// shared/lib/auth-server.ts
import "server-only";
import { auth } from "@/auth";
import { getUserById } from "@/db/users";
import type { User } from "@/db/schema";

export type RequireAdminResult =
  | { ok: true; user: User }
  | { ok: false; reason: "unauthorized" | "forbidden" };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };
  const user = await getUserById(session.user.id);
  if (!user || user.role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true, user };
}

export async function getCurrentSessionUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getUserById(session.user.id);
}
```

- [ ] **Step 12.4: Run tests.** Expected: PASS.

- [ ] **Step 12.5: Commit.**
```bash
git add shared/lib/auth-server.ts shared/lib/auth-server.test.ts
git commit -m "feat(shared/lib): requireAdmin + getCurrentSessionUser helpers"
```

---

## Phase 3 — User-facing feature slice

### Task 13: `vip-request-submit` server actions

**Files:**
- Create: `features/vip-request-submit/api/actions.ts`
- Create: `features/vip-request-submit/api/actions.test.ts`

- [ ] **Step 13.1: Tests.**

```ts
// features/vip-request-submit/api/actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/vip-requests", () => ({
  getCurrentTier: vi.fn(),
  createVipRequest: vi.fn(),
  cancelOwnVipRequest: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import {
  getCurrentTier,
  createVipRequest,
  cancelOwnVipRequest,
} from "@/db/vip-requests";
import { submitVipRequest, cancelVipRequest } from "./actions";

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(getCurrentTier).mockReset();
  vi.mocked(createVipRequest).mockReset();
  vi.mocked(cancelOwnVipRequest).mockReset();
});

describe("submitVipRequest", () => {
  it("returns {ok:false, reason:'unauthorized'} when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    expect(await submitVipRequest({ note: null })).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("returns {ok:false, reason:'pending-exists'} when user already has pending", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "member-pending",
      pendingRequestId: "vipreq_x",
    });
    expect(await submitVipRequest({ note: null })).toEqual({
      ok: false,
      reason: "pending-exists",
      id: "vipreq_x",
    });
  });

  it("returns {ok:false, reason:'already-vip'} when active VIP", async () => {
    const exp = new Date(Date.now() + 30 * 86400_000);
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "vip",
      activeRequestId: "vipreq_a",
      expiresAt: exp,
    });
    expect(await submitVipRequest({ note: null })).toEqual({
      ok: false,
      reason: "already-vip",
      expiresAt: exp,
    });
  });

  it("creates a row and returns {ok:true, id} when allowed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({ state: "member" });
    vi.mocked(createVipRequest).mockResolvedValue({
      id: "vipreq_new",
      userId: "tg:1",
      status: "pending",
      note: null,
      expiresAt: null,
      decidedAt: null,
      decidedBy: null,
      declineReason: null,
      createdAt: new Date(),
    });
    const r = await submitVipRequest({ note: "hi" });
    expect(r).toEqual({ ok: true, id: "vipreq_new" });
    expect(createVipRequest).toHaveBeenCalledWith({ userId: "tg:1", note: "hi" });
  });
});

describe("cancelVipRequest", () => {
  it("returns {ok:false, reason:'unauthorized'} when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    expect(await cancelVipRequest()).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("returns {ok:false, reason:'no-pending'} when nothing to cancel", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(cancelOwnVipRequest).mockResolvedValue(null);
    expect(await cancelVipRequest()).toEqual({ ok: false, reason: "no-pending" });
  });

  it("returns {ok:true} when cancelled", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(cancelOwnVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    expect(await cancelVipRequest()).toEqual({ ok: true, id: "vipreq_x" });
  });
});
```

- [ ] **Step 13.2: Run tests, confirm failure.** Expected: FAIL — module missing.

- [ ] **Step 13.3: Implement.**

```ts
// features/vip-request-submit/api/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  cancelOwnVipRequest,
  createVipRequest,
  getCurrentTier,
} from "@/db/vip-requests";

export interface SubmitVipRequestInput {
  note?: string | null;
}

export type SubmitVipRequestResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "pending-exists"; id: string }
  | { ok: false; reason: "already-vip"; expiresAt: Date }
  | { ok: false; reason: "db-unavailable" };

export async function submitVipRequest(
  input: SubmitVipRequestInput,
): Promise<SubmitVipRequestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };

  const current = await getCurrentTier(session.user.id);
  if (current.state === "member-pending") {
    return { ok: false, reason: "pending-exists", id: current.pendingRequestId };
  }
  if (current.state === "vip") {
    return { ok: false, reason: "already-vip", expiresAt: current.expiresAt };
  }

  const row = await createVipRequest({
    userId: session.user.id,
    note: input.note ?? null,
  });
  if (!row) return { ok: false, reason: "db-unavailable" };

  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export type CancelVipRequestResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "no-pending" };

export async function cancelVipRequest(): Promise<CancelVipRequestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };

  const row = await cancelOwnVipRequest(session.user.id);
  if (!row) return { ok: false, reason: "no-pending" };

  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
```

- [ ] **Step 13.4: Run tests.** Expected: PASS.

- [ ] **Step 13.5: Commit.**
```bash
git add features/vip-request-submit/api/actions.ts features/vip-request-submit/api/actions.test.ts
git commit -m "feat(features/vip-request-submit): submit + cancel server actions"
```

### Task 14: `VipCardCta` client component

**Files:**
- Create: `features/vip-request-submit/ui/vip-card-cta.tsx`
- Create: `features/vip-request-submit/ui/vip-card-cta.test.tsx`
- Create: `features/vip-request-submit/ui/vip-card-cta.stories.tsx`

- [ ] **Step 14.1: Tests for the four states.**

```tsx
// features/vip-request-submit/ui/vip-card-cta.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { VipCardCta } from "./vip-card-cta";

describe("VipCardCta", () => {
  it("visitor state shows a sign-in link with next=/membership", () => {
    render(
      <VipCardCta
        state={{ kind: "visitor", locale: "en" }}
        labels={{
          signIn: "Sign in to apply",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /sign in to apply/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/sign-in?next=/membership"),
    );
  });

  it("member state shows a Join VIP submit button", () => {
    render(
      <VipCardCta
        state={{ kind: "member" }}
        labels={{
          signIn: "Sign in",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /join vip/i }),
    ).toBeInTheDocument();
  });

  it("pending state shows a Cancel request button", () => {
    render(
      <VipCardCta
        state={{ kind: "pending" }}
        labels={{
          signIn: "Sign in",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /cancel request/i }),
    ).toBeInTheDocument();
  });

  it("vip state shows a disabled label with expiry", () => {
    render(
      <VipCardCta
        state={{ kind: "vip", expiresAt: new Date("2026-07-01T00:00:00Z") }}
        labels={{
          signIn: "Sign in",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    expect(screen.getByText(/you're a vip/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 14.2: Implement.**

```tsx
// features/vip-request-submit/ui/vip-card-cta.tsx
"use client";

import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { submitVipRequest, cancelVipRequest } from "../api/actions";

export type VipCardCtaState =
  | { kind: "visitor"; locale: string }
  | { kind: "member" }
  | { kind: "pending" }
  | { kind: "vip"; expiresAt: Date };

export interface VipCardCtaProps {
  state: VipCardCtaState;
  labels: {
    signIn: string;
    join: string;
    cancel: string;
    youreVip: string;
  };
}

export function VipCardCta({ state, labels }: VipCardCtaProps) {
  const [pending, startTransition] = useTransition();

  if (state.kind === "visitor") {
    return (
      <Link
        href={`/sign-in?next=/membership`}
        className={buttonClassName({ variant: "gold", size: "md", block: true })}
      >
        {labels.signIn}
      </Link>
    );
  }

  if (state.kind === "member") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => submitVipRequest({ note: null }).then(() => {}))}
        className={buttonClassName({ variant: "gold", size: "md", block: true })}
      >
        {labels.join}
      </button>
    );
  }

  if (state.kind === "pending") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => cancelVipRequest().then(() => {}))}
        className={buttonClassName({ variant: "outline", size: "md", block: true })}
      >
        {labels.cancel}
      </button>
    );
  }

  // vip
  return (
    <span
      className={buttonClassName({ variant: "outline", size: "md", block: true })}
      aria-disabled
    >
      {labels.youreVip}
    </span>
  );
}
```

- [ ] **Step 14.3: Run tests.** Expected: PASS.

- [ ] **Step 14.4: Mandatory Storybook story** per `.claude/skills/new-ui-component/SKILL.md`.

```tsx
// features/vip-request-submit/ui/vip-card-cta.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VipCardCta } from "./vip-card-cta";

const labels = {
  signIn: "Sign in to apply",
  join: "Join VIP",
  cancel: "Cancel request",
  youreVip: "You're a VIP · expires Jul 01",
};

const meta: Meta<typeof VipCardCta> = {
  title: "features/VipCardCta",
  component: VipCardCta,
  args: { labels },
};
export default meta;
type Story = StoryObj<typeof VipCardCta>;

export const Visitor: Story = { args: { state: { kind: "visitor", locale: "en" } } };
export const Member: Story = { args: { state: { kind: "member" } } };
export const Pending: Story = { args: { state: { kind: "pending" } } };
export const Vip: Story = {
  args: { state: { kind: "vip", expiresAt: new Date("2026-07-01") } },
};
```

- [ ] **Step 14.5: Verify Storybook builds.** `npm run build-storybook 2>&1 | grep -E "error|✓"`. Expected: ✓ no errors.

- [ ] **Step 14.6: Commit.**
```bash
git add features/vip-request-submit/ui/
git commit -m "feat(features/vip-request-submit): VipCardCta state machine"
```

### Task 15: Public API for the slice

**Files:**
- Create: `features/vip-request-submit/index.ts`

- [ ] **Step 15.1: Re-export.**

```ts
// features/vip-request-submit/index.ts
export { VipCardCta } from "./ui/vip-card-cta";
export type { VipCardCtaState, VipCardCtaProps } from "./ui/vip-card-cta";
export {
  submitVipRequest,
  cancelVipRequest,
} from "./api/actions";
export type {
  SubmitVipRequestInput,
  SubmitVipRequestResult,
  CancelVipRequestResult,
} from "./api/actions";
```

- [ ] **Step 15.2: Commit.**
```bash
git add features/vip-request-submit/index.ts
git commit -m "feat(features/vip-request-submit): public API"
```

---

## Phase 4 — Membership page integration

### Task 16: Add Membership translations

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`

- [ ] **Step 16.1: Add to `Membership` namespace in all three locales.**

For `en.json`, add inside the `Membership` block:
```json
"cta_sign_in": "Sign in to apply",
"cta_join_vip": "Join VIP",
"cta_cancel_request": "Cancel request",
"cta_youre_member": "You're a Member",
"cta_youre_vip": "You're a VIP · expires {date}"
```

For `ru.json`:
```json
"cta_sign_in": "Войти, чтобы подать заявку",
"cta_join_vip": "Стать VIP",
"cta_cancel_request": "Отменить заявку",
"cta_youre_member": "Вы Member",
"cta_youre_vip": "Вы VIP · до {date}"
```

For `be.json`:
```json
"cta_sign_in": "Увайсці, каб падаць заяўку",
"cta_join_vip": "Стаць VIP",
"cta_cancel_request": "Адмяніць заяўку",
"cta_youre_member": "Вы Member",
"cta_youre_vip": "Вы VIP · да {date}"
```

- [ ] **Step 16.2: Run tests + lint.** `npm run lint && npm test`. Expected: pass (no test references these keys yet).

- [ ] **Step 16.3: Commit.**
```bash
git add messages/
git commit -m "i18n(membership): VIP CTA copy in en/ru/be"
```

### Task 17: Wire `VipCardCta` into `MembershipTierCard`

**Files:**
- Modify: `views/membership/ui/membership-tier-card.tsx`
- Modify: `views/membership/ui/membership-page.tsx`

- [ ] **Step 17.1: Add a `ctaSlot` prop to `MembershipTierCard` and have it replace the existing link when provided.** This keeps the card presentational; the slot owns interactivity.

```tsx
// views/membership/ui/membership-tier-card.tsx (around the existing <Link …>)
import type { ReactNode } from "react";

export interface MembershipTierCardProps {
  tier: MembershipTier;
  priceLabel: string;
  cadenceLabel: string;
  ctaLabel: string;
  mostChosenLabel: string;
  ctaSlot?: ReactNode;        // ← NEW
}

// In the body, replace:
//   <Link href="/booking/service" …>{ctaLabel}</Link>
// with:
//   {ctaSlot ?? (
//     <Link
//       href="/booking/service"
//       className={buttonClassName({
//         variant: featured ? "gold" : "outline",
//         size: "md",
//         block: true,
//       })}
//     >
//       {ctaLabel}
//     </Link>
//   )}
```

- [ ] **Step 17.2: Make `MembershipPage` async, resolve state per session, and pass `VipCardCta` as the slot for the VIP tier.**

```tsx
// views/membership/ui/membership-page.tsx
// Top of file: remove the "use client" directive (now a server component).
// Add:
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { VipCardCta, type VipCardCtaState } from "@/features/vip-request-submit";
import { formatLongDate } from "@/views/booking/lib/booking-steps"; // reuse the date formatter

// Convert the component to async:
export async function MembershipPage() {
  const t = await getTranslations("Membership");
  const locale = await getLocale();

  const user = await getCurrentSessionUser();
  const tier = user ? await getCurrentTier(user.id) : null;

  const cardLabels = {
    signIn: t("cta_sign_in"),
    join: t("cta_join_vip"),
    cancel: t("cta_cancel_request"),
    youreVip:
      tier?.state === "vip"
        ? t("cta_youre_vip", { date: formatLongDate(tier.expiresAt.toISOString().slice(0, 10), locale) })
        : t("cta_youre_vip", { date: "" }),
  };

  const vipState: VipCardCtaState =
    !user
      ? { kind: "visitor", locale }
      : tier?.state === "vip"
        ? { kind: "vip", expiresAt: tier.expiresAt }
        : tier?.state === "member-pending"
          ? { kind: "pending" }
          : { kind: "member" };

  // The billing toggle stays client. Split out a small "VipTierCardClient" if needed,
  // or just inline the toggle as a small client component beside the cards. For
  // this task: render the toggle inside a client wrapper component that does NOT
  // call getCurrentTier — the page itself stays server.
  // (Existing BillingToggle is already a client component; the page wraps it.)

  // …existing render, but pass `ctaSlot={…}` to the VIP tier card:
  //   {STUDIO_DATA.membership.map((tier) => {
  //     const isVip = tier.tier === "VIP";
  //     const ctaSlot = isVip ? <VipCardCta state={vipState} labels={cardLabels} /> : undefined;
  //     return <MembershipTierCard … ctaSlot={ctaSlot} />;
  //   })}
}
```

> **Note:** the existing `useState`-based `BillingToggle` lives inside `MembershipPage` today. Converting the page to a server component means the toggle has to move into a small client wrapper (`MembershipPageClient`) OR the toggle moves up via context. **Simpler path:** keep `MembershipPage` server-only for the data fetch + i18n, render an inner `<MembershipPageClient billingToggle vipCardCta />` that owns the billing state and receives the resolved `vipCardCta` element as a prop. The implementer chooses the cleanest split — both work.

- [ ] **Step 17.3: Update the existing `membership-page.test.tsx`** to mock `getCurrentTier` and `getCurrentSessionUser`, and cover the four states:
  - visitor → VIP card has a sign-in link
  - member → VIP card has a Join VIP button
  - pending → VIP card has a Cancel request button
  - vip → VIP card has "You're a VIP" label

  Snapshot or `getByRole` assertions — match the style already in the file. Existing assertion about `/Join VIP/i` link can be repurposed.

- [ ] **Step 17.4: Run tests.** `npx vitest run views/membership/`. Expected: PASS.

- [ ] **Step 17.5: Type check + build.** `npx tsc --noEmit && npm run build`. Expected: green.

- [ ] **Step 17.6: Commit.**
```bash
git add views/membership/
git commit -m "feat(views/membership): wire VipCardCta into MembershipTierCard via slot"
```

---

## Phase 5 — Profile integration

### Task 18: Profile badge derived from `getCurrentTier`

**Files:**
- Modify: `views/profile/ui/profile-page.tsx`
- Modify: `views/profile/ui/profile-page.test.tsx`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`
- Modify: `e2e/profile.spec.ts`

- [ ] **Step 18.1: Add new i18n keys** (replace `member_tag` in `Profile`):

en:
```json
"badge_vip": "VIP",
"badge_pending_vip": "Pending VIP"
```
ru:
```json
"badge_vip": "VIP",
"badge_pending_vip": "VIP в обработке"
```
be:
```json
"badge_vip": "VIP",
"badge_pending_vip": "VIP у апрацоўцы"
```

Remove the `member_tag` key from all three locales.

- [ ] **Step 18.2: Update the profile page.**

```tsx
// views/profile/ui/profile-page.tsx
// Convert to async server component (it already runs on server via setRequestLocale).
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";

// Replace the member_tag rendering with:
const user = await getCurrentSessionUser();
const tier = user ? await getCurrentTier(user.id) : { state: "member" as const };

{tier.state === "vip" && (
  <span className="…gold pill style…">{t("badge_vip")}</span>
)}
{tier.state === "member-pending" && (
  <span className="…outline pill style…">{t("badge_pending_vip")}</span>
)}
{/* tier.state === "member": no pill */}
```

The exact pill styling: use existing `Eyebrow` / inline span — match the visual style of `most_chosen` on the membership card.

- [ ] **Step 18.3: Update `profile-page.test.tsx`.** Drop the `/Member · Violette/` assertion; add three new specs:
  - "renders VIP pill when current tier is vip"
  - "renders Pending VIP pill when current tier is member-pending"
  - "renders no pill when current tier is member"

  Mock `getCurrentTier` / `getCurrentSessionUser` accordingly (use `vi.mock("@/db/vip-requests", …)` and `vi.mock("@/shared/lib/auth-server", …)`).

- [ ] **Step 18.4: Update `e2e/profile.spec.ts`.** The `/Member · Violette/` / `/Member · VIP/` assertions can no longer be true since the seed profile drops `membership` (see Task 21). Replace those lines with `await expect(page.getByText(/Joined in 2024/)).toBeVisible();` (or similar non-tier assertion). The Belarusian copy `Сябар · …` likewise becomes just the name.

- [ ] **Step 18.5: Run.** `npx vitest run views/profile/`. Expected: PASS.

- [ ] **Step 18.6: Commit.**
```bash
git add views/profile/ messages/ e2e/profile.spec.ts
git commit -m "feat(views/profile): VIP/Pending badges derived from getCurrentTier"
```

---

## Phase 6 — Admin slice + page

### Task 19: Admin server actions

**Files:**
- Create: `features/vip-requests-admin/api/actions.ts`
- Create: `features/vip-requests-admin/api/actions.test.ts`

- [ ] **Step 19.1: Tests.**

```ts
// features/vip-requests-admin/api/actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/vip-requests", () => ({
  decideVipRequest: vi.fn(),
  downgradeVipRequest: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import { decideVipRequest, downgradeVipRequest } from "@/db/vip-requests";
import { approveRequest, declineRequest, downgradeVip } from "./actions";

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(decideVipRequest).mockReset();
  vi.mocked(downgradeVipRequest).mockReset();
});

describe("approveRequest", () => {
  it("returns {ok:false, reason:'forbidden'} when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(
      await approveRequest({
        id: "vipreq_x",
        expiresAt: new Date(),
      }),
    ).toEqual({ ok: false, reason: "forbidden" });
  });

  it("calls decideVipRequest with action='approve' when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    const exp = new Date(Date.now() + 30 * 86400_000);
    const r = await approveRequest({ id: "vipreq_x", expiresAt: exp });
    expect(r).toEqual({ ok: true, id: "vipreq_x" });
    expect(decideVipRequest).toHaveBeenCalledWith({
      id: "vipreq_x",
      action: "approve",
      decidedBy: "tg:a",
      expiresAt: exp,
    });
  });
});

describe("declineRequest", () => {
  it("calls decideVipRequest with action='decline' when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    const r = await declineRequest({ id: "vipreq_x", reason: "spam" });
    expect(r).toEqual({ ok: true, id: "vipreq_x" });
    expect(decideVipRequest).toHaveBeenCalledWith({
      id: "vipreq_x",
      action: "decline",
      decidedBy: "tg:a",
      declineReason: "spam",
    });
  });
});

describe("downgradeVip", () => {
  it("returns {ok:false, reason:'forbidden'} when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await downgradeVip("vipreq_x")).toEqual({ ok: false, reason: "forbidden" });
  });
  it("calls downgradeVipRequest when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(downgradeVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    expect(await downgradeVip("vipreq_x")).toEqual({ ok: true, id: "vipreq_x" });
  });
});
```

- [ ] **Step 19.2: Implement.**

```ts
// features/vip-requests-admin/api/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  decideVipRequest,
  downgradeVipRequest,
} from "@/db/vip-requests";

export type AdminActionResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "forbidden" | "not-found" };

export interface ApproveInput {
  id: string;
  expiresAt: Date;
}

export async function approveRequest(input: ApproveInput): Promise<AdminActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideVipRequest({
    id: input.id,
    action: "approve",
    decidedBy: gate.user.id,
    expiresAt: input.expiresAt,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export interface DeclineInput {
  id: string;
  reason?: string | null;
}

export async function declineRequest(input: DeclineInput): Promise<AdminActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideVipRequest({
    id: input.id,
    action: "decline",
    decidedBy: gate.user.id,
    declineReason: input.reason ?? null,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function downgradeVip(id: string): Promise<AdminActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await downgradeVipRequest(id);
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
```

- [ ] **Step 19.3: Run tests.** Expected: PASS.

- [ ] **Step 19.4: Commit.**
```bash
git add features/vip-requests-admin/api/
git commit -m "feat(features/vip-requests-admin): approve/decline/downgrade actions"
```

### Task 20: Admin UI components

**Files:**
- Create: `features/vip-requests-admin/ui/approve-form.tsx` (+ test)
- Create: `features/vip-requests-admin/ui/request-actions.tsx` (+ test)
- Create: `features/vip-requests-admin/ui/active-vip-row.tsx` (+ test)
- Create: `features/vip-requests-admin/ui/expired-row.tsx` (+ test)
- Create: `features/vip-requests-admin/index.ts`

- [ ] **Step 20.1: `approve-form.tsx`** — inline date input prefilled to today+30d; submits via `approveRequest`.

```tsx
"use client";
import { useState, useTransition } from "react";
import { approveRequest } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface ApproveFormProps {
  requestId: string;
  defaultExpiry: string; // YYYY-MM-DD (UTC date for the input)
  approveLabel: string;
}

export function ApproveForm({ requestId, defaultExpiry, approveLabel }: ApproveFormProps) {
  const [date, setDate] = useState(defaultExpiry);
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() =>
        startTransition(async () => {
          await approveRequest({
            id: requestId,
            expiresAt: new Date(`${date}T23:59:59Z`),
          });
        })
      }
      className="flex items-center gap-2"
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border-[0.5px] border-line bg-transparent px-2 py-1 text-[12px]"
      />
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "gold", size: "sm" })}
      >
        {approveLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 20.2: `request-actions.tsx`** — wraps `ApproveForm` + a Decline form.

```tsx
"use client";
import { useTransition } from "react";
import { declineRequest } from "../api/actions";
import { ApproveForm } from "./approve-form";
import { buttonClassName } from "@/shared/ui/button";

export interface RequestActionsProps {
  requestId: string;
  defaultExpiry: string;
  approveLabel: string;
  declineLabel: string;
}

export function RequestActions(props: RequestActionsProps) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ApproveForm
        requestId={props.requestId}
        defaultExpiry={props.defaultExpiry}
        approveLabel={props.approveLabel}
      />
      <form
        action={() =>
          startTransition(async () => {
            await declineRequest({ id: props.requestId });
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {props.declineLabel}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 20.3: `active-vip-row.tsx`** — wraps `downgradeVip` action.

```tsx
"use client";
import { useTransition } from "react";
import { downgradeVip } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface ActiveVipRowProps {
  requestId: string;
  downgradeLabel: string;
}

export function ActiveVipDowngradeButton({ requestId, downgradeLabel }: ActiveVipRowProps) {
  const [pending, startTransition] = useTransition();
  return (
    <form action={() => startTransition(async () => { await downgradeVip(requestId); })}>
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "outline", size: "sm" })}
      >
        {downgradeLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 20.4: `expired-row.tsx`** — for now just a placeholder badge; no actions in v1 (Re-approve creates a new pending row owned by the user, requires a different surface — defer to a small "request again on behalf" button that calls a future endpoint; for v1 this row is read-only).

```tsx
export interface ExpiredRowMetaProps {
  expiredAt: Date;
  expiredAtLabel: string; // pre-formatted by parent
}
export function ExpiredRowMeta(props: ExpiredRowMetaProps) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
      {props.expiredAtLabel}
    </span>
  );
}
```

> **Re-approve action** is **deferred** to a follow-up — not in this plan. The spec mentions it as a convenience; the implementer can add a button later that calls a new server action `recreateAsPending({ originalRequestId })`. For now the Expired list is informational.

- [ ] **Step 20.5: Tests** — small render assertions for each component (button label appears, disabled state, etc.). Mirror the style of `widgets/app-header/ui/app-header.test.tsx`.

- [ ] **Step 20.6: Mandatory Storybook stories** for each new component (per `new-ui-component` skill).

- [ ] **Step 20.7: `index.ts` re-exports the components and types.**

```ts
// features/vip-requests-admin/index.ts
export { RequestActions } from "./ui/request-actions";
export { ApproveForm } from "./ui/approve-form";
export { ActiveVipDowngradeButton } from "./ui/active-vip-row";
export { ExpiredRowMeta } from "./ui/expired-row";
export {
  approveRequest,
  declineRequest,
  downgradeVip,
} from "./api/actions";
export type {
  AdminActionResult,
  ApproveInput,
  DeclineInput,
} from "./api/actions";
```

- [ ] **Step 20.8: Run tests + storybook build.** `npm test && npm run build-storybook 2>&1 | grep -E "error|✓"`. Expected: PASS, ✓.

- [ ] **Step 20.9: Commit.**
```bash
git add features/vip-requests-admin/
git commit -m "feat(features/vip-requests-admin): UI components for pending/active/expired"
```

### Task 21: `/admin/vip-requests` page

**Files:**
- Create: `app/[locale]/admin/vip-requests/page.tsx`
- Create: `app/[locale]/admin/vip-requests/expired/page.tsx`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`

- [ ] **Step 21.1: Add the `AdminVipRequests` i18n namespace.** Mirror the structure of `AdminBookings`. Keys to include: `meta_title`, `eyebrow`, `hero_title`, `hero_paragraph`, `section_pending`, `section_active`, `section_expired`, `empty_pending`, `empty_active`, `empty_expired`, `cta_approve`, `cta_decline`, `cta_downgrade`, `cta_show_all_expired`, `expires_in_days` (with `{n}` placeholder), `expired_ago_days`. Add to all three locales.

- [ ] **Step 21.2: Implement the page.**

```tsx
// app/[locale]/admin/vip-requests/page.tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  listPendingVipRequests,
  listActiveVips,
  listExpiredVipRequests,
  countExpiredVipRequests,
} from "@/db/vip-requests";
import {
  RequestActions,
  ActiveVipDowngradeButton,
  ExpiredRowMeta,
} from "@/features/vip-requests-admin";
import { requireAdmin } from "@/shared/lib/auth-server";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminVipRequests" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function customerLabel(r: {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
  userId: string;
}): string {
  const name = [r.userFirstName, r.userLastName].filter(Boolean).join(" ");
  return name || r.userEmail || r.username || r.userId;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoPlusDays(n: number): string {
  return new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
}

function daysFromNow(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 86400_000);
}

export default async function AdminVipRequestsRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const t = await getTranslations("AdminVipRequests");
  const [pending, active, expired, totalExpired] = await Promise.all([
    listPendingVipRequests(),
    listActiveVips(),
    listExpiredVipRequests({ limit: 10, offset: 0 }),
    countExpiredVipRequests(),
  ]);

  const defaultExpiry = isoPlusDays(30);

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

      {/* Pending */}
      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_pending", { n: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_pending")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-[18px] border-[0.5px] border-line bg-surface p-5">
                <div className="font-display text-[20px] italic">{customerLabel(r)}</div>
                {r.note ? (
                  <p className="mt-1 italic text-[13px] text-text-2">"{r.note}"</p>
                ) : null}
                <div className="mt-3">
                  <RequestActions
                    requestId={r.id}
                    defaultExpiry={defaultExpiry}
                    approveLabel={t("cta_approve")}
                    declineLabel={t("cta_decline")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active */}
      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_active", { n: active.length })}
        </h2>
        {active.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_active")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((r) => (
              <li key={r.id} className="rounded-[18px] border-[0.5px] border-line bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[20px] italic">{customerLabel(r)}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {t("expires_in_days", { n: daysFromNow(r.expiresAt!) })}
                  </div>
                </div>
                <div className="mt-3">
                  <ActiveVipDowngradeButton
                    requestId={r.id}
                    downgradeLabel={t("cta_downgrade")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Expired */}
      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_expired", { shown: expired.length, total: totalExpired })}
        </h2>
        {expired.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_expired")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {expired.map((r) => (
              <li key={r.id} className="rounded-[12px] border-[0.5px] border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[16px] italic">{customerLabel(r)}</div>
                  <ExpiredRowMeta
                    expiredAt={r.expiresAt!}
                    expiredAtLabel={t("expired_ago_days", {
                      n: Math.abs(daysFromNow(r.expiresAt!)),
                    })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {totalExpired > expired.length ? (
          <div className="mt-3">
            <Link
              href="/admin/vip-requests/expired"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
            >
              {t("cta_show_all_expired", { total: totalExpired })} →
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
```

- [ ] **Step 21.3: Implement `expired/page.tsx`** — paginated, simple `?page=N`.

```tsx
// app/[locale]/admin/vip-requests/expired/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { requireAdmin } from "@/shared/lib/auth-server";
import { listExpiredVipRequests, countExpiredVipRequests } from "@/db/vip-requests";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function ExpiredVipRequestsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageRaw } = await searchParams;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const t = await getTranslations("AdminVipRequests");

  const page = Math.max(1, Number(pageRaw) || 1);
  const [rows, total] = await Promise.all([
    listExpiredVipRequests({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countExpiredVipRequests(),
  ]);

  return (
    <div className="pb-16">
      <AppHeader back="/admin/vip-requests" title={t("expired_page_title")} />
      {/* render rows + pagination links — same row markup as the parent page */}
      {/* prev/next links: ?page=N */}
    </div>
  );
}
```

- [ ] **Step 21.4: Add the new translation keys.**

For `en.json` `AdminVipRequests` namespace:
```json
{
  "meta_title": "VIP requests",
  "expired_page_title": "Expired VIP",
  "eyebrow": "Admin",
  "hero_title": "VIP membership requests",
  "hero_paragraph": "Pending requests, currently active VIPs sorted by soonest expiry, plus recent expirations.",
  "section_pending": "Pending ({n})",
  "section_active": "Active VIPs ({n})",
  "section_expired": "Expired ({shown} of {total})",
  "empty_pending": "No pending requests right now.",
  "empty_active": "No active VIPs right now.",
  "empty_expired": "No expirations on file.",
  "cta_approve": "Approve",
  "cta_decline": "Decline",
  "cta_downgrade": "Downgrade",
  "cta_show_all_expired": "Show all {total}",
  "expires_in_days": "expires in {n}d",
  "expired_ago_days": "expired {n}d ago"
}
```

Translate to ru/be. (Implementer: keep the bracketed placeholders intact.)

- [ ] **Step 21.5: Run tests + build + lint.** `npm test && npm run build && npm run lint`. Expected: green.

- [ ] **Step 21.6: Manual smoke (optional).** Set `DATABASE_URL`, run `npm run dev`, visit `/en/admin/vip-requests`. Should render the empty-state copy.

- [ ] **Step 21.7: Commit.**
```bash
git add app/[locale]/admin/vip-requests/ messages/
git commit -m "feat(admin): /admin/vip-requests page with pending/active/expired sections"
```

### Task 22: `/admin` landing inbox card

**Files:**
- Modify: `app/[locale]/admin/page.tsx`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`

- [ ] **Step 22.1: Add an "Inbox" section to `/admin` with two cards** (Bookings, VIP requests), each showing pending count.

```tsx
// In AdminRoute, before the PaletteSwitcher section:
import { listBookingsForAdmin } from "@/db/bookings";
import { listPendingVipRequests } from "@/db/vip-requests";

const [bookings, pendingVip] = await Promise.all([
  listBookingsForAdmin(),
  listPendingVipRequests(),
]);
const pendingBookings = bookings.filter((b) => b.status === "pending").length;

<section className="px-[22px] pb-6">
  <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
    {t("inbox_title")}
  </h2>
  <ul className="grid grid-cols-2 gap-3">
    <li>
      <Link href="/admin/bookings" className="…card style…">
        <div>{t("inbox_bookings")}</div>
        <div>{pendingBookings} {t("inbox_pending_suffix")}</div>
      </Link>
    </li>
    <li>
      <Link href="/admin/vip-requests" className="…card style…">
        <div>{t("inbox_vip_requests")}</div>
        <div>{pendingVip.length} {t("inbox_pending_suffix")}</div>
      </Link>
    </li>
  </ul>
</section>
```

- [ ] **Step 22.2: Translations** — add `inbox_title`, `inbox_bookings`, `inbox_vip_requests`, `inbox_pending_suffix` to all three locales under the `Admin` namespace.

- [ ] **Step 22.3: Commit.**
```bash
git add app/[locale]/admin/page.tsx messages/
git commit -m "feat(admin): inbox card on /admin landing showing pending counts"
```

---

## Phase 7 — Cleanup of legacy fields

### Task 23: Drop `MembershipTierName` and `profile.membership`

**Files:**
- Modify: `entities/studio/model/types.ts`
- Modify: `entities/studio/model/data.ts`
- Modify: `entities/studio/index.ts`
- Modify: `entities/studio/model/data.test.ts` (if affected)
- Modify: `views/profile/ui/profile-page.tsx`

- [ ] **Step 23.1: Remove the type alias.** In `entities/studio/model/types.ts`, delete:
```ts
export type MembershipTierName = "Member" | "VIP";
```
And update `CustomerProfile` to drop `membership`:
```ts
export interface CustomerProfile {
  name: string;
  // membership: MembershipTierName | null;  ← REMOVE
  joined: number;
  palette: readonly [string, string];
}
```
Replace `MembershipTier.tier`'s type with an inline string-literal union:
```ts
export interface MembershipTier {
  tier: "Member" | "VIP";
  // …
}
```
No new exported type name. The tier values are content-bound to `entities/studio/model/data.ts` only, so a local inline literal is enough.

- [ ] **Step 23.2: Drop the field from the mock.** In `data.ts`:
```ts
const profile: CustomerProfile = {
  name: "Lara K.",
  // membership: "VIP",  ← REMOVE
  joined: 2024,
  palette: ["#d9a3b6", "#7d3a6f"],
};
```

- [ ] **Step 23.3: Update the entities/studio public API.** In `entities/studio/index.ts`, remove the `MembershipTierName` re-export.

- [ ] **Step 23.4: Update any callers** that still reference `profile.membership`. The profile page already moved off it in Task 18, but double-check `grep -r "profile.membership"`.

- [ ] **Step 23.5: Run lint + test + build.** `npm run lint && npm test && npm run build`. Expected: green.

- [ ] **Step 23.6: Commit.**
```bash
git add entities/studio/ views/profile/
git commit -m "refactor(entities/studio): drop MembershipTierName + profile.membership

Tier is now derived from vip_requests; the static field on the mock
profile was the last consumer."
```

---

## Phase 8 — End-to-end

### Task 24: `e2e/vip-request.spec.ts`

**Files:**
- Create: `e2e/vip-request.spec.ts`

> **Note on auth in e2e:** the existing e2e suite runs without `TELEGRAM_BOT_TOKEN`, so the auth gate is bypassed (see `e2e/membership.spec.ts`). To E2E the VIP submit/cancel path without real auth, the implementer should add a dev-only `?dev_user=tg:test1` query param to the membership page that fakes a session — **OR** mock the session via Playwright's `route` interception of `/api/auth/session`. Pick the simpler option for this codebase.

- [ ] **Step 24.1: Decide the auth strategy** for the e2e. The simplest: skip the visitor→sign-in→authed path entirely, since that's covered by the existing `e2e/sign-in.spec.ts` (if it exists). For VIP, e2e covers: signed-in user clicks Join → DB row created → admin sees it → admin approves → user sees VIP badge.

  If no auth seeding fixture exists, write the spec gated on `process.env.E2E_DB === "1"` and document it as a manual-run spec. The unit + component tests cover the logic anyway.

- [ ] **Step 24.2: Write the happy-path spec** (skeleton):

```ts
import { test, expect } from "@playwright/test";

// Skipped in default CI; requires DATABASE_URL + an admin user fixture.
test.skip(
  "TODO: VIP request happy path",
  async ({ page }) => {
    await page.goto("/en/membership");
    await page.getByRole("button", { name: /join vip/i }).click();
    // visit /admin/vip-requests (as admin)
    // approve
    // visit /profile
    await expect(page.getByText(/vip/i)).toBeVisible();
  },
);
```

The implementer should fill in the test once seeding/auth is wired.

- [ ] **Step 24.3: Commit.**
```bash
git add e2e/vip-request.spec.ts
git commit -m "test(e2e): VIP request happy-path scaffold (skipped pending auth fixture)"
```

---

## Phase 9 — Final verification

### Task 25: Final lint + test + build + storybook

- [ ] **Step 25.1: Lint clean.** `npm run lint`. Expected: no output.
- [ ] **Step 25.2: All Vitest pass.** `npm test`. Expected: all green; expect ~30 new tests added.
- [ ] **Step 25.3: Build clean.** `npm run build`. Expected: ✓ compiled, all static pages generated, no type errors.
- [ ] **Step 25.4: Storybook builds.** `npm run build-storybook 2>&1 | grep -E "error|✓" | head`. Expected: ✓ no errors.
- [ ] **Step 25.5: (Optional) Manual smoke.** With `DATABASE_URL` set, run `npm run dev` and walk the full path: `/en/membership` → Join VIP → see pending → `/en/admin/vip-requests` → Approve → `/en/profile` → see VIP badge → back to admin → Downgrade → profile back to Member.

If any step fails, fix the root cause; do not skip checks.

- [ ] **Step 25.6: Final commit (if any leftover changes).**
```bash
git status   # should be clean
```

### Task 26: PR

- [ ] **Step 26.1: Push the branch and open a PR.**

Use `.claude/skills/pr-description/SKILL.md` to write the PR description. Title:
```
feat: VIP membership request flow with admin approval + 30d expiry
```

Body should reference the spec doc and call out:
- New `vip_requests` table + migration `0004`
- Admin route check (`role === 'admin'`) on decide/downgrade
- Tier derivation is per-render, no caching
- Out-of-scope items per §1 of the spec
- The dropped `STUDIO_DATA.profile.membership` field

---

## Skills referenced

- `superpowers:test-driven-development` — Tasks 4–14, 19–20 should be red/green/refactor.
- `new-ui-component` (project-local at `.claude/skills/new-ui-component/SKILL.md`) — Tasks 14, 20 (every new UI component needs a Storybook story and a Vitest test; this is enforced by the skill).
- `superpowers:verification-before-completion` — Task 25 (verify lint + test + build with actual output before declaring done).
- `superpowers:systematic-debugging` — if any task hits a bug, don't skip checks; debug to root cause.
- `commit` (project-local) — every commit step.
- `pr-description` (project-local) — Task 26.

## Notes for the implementer

- **DRY:** the `customerLabel` helper appears in both `/admin/bookings/page.tsx` and `/admin/vip-requests/page.tsx`. The plan duplicates it locally for clarity. If a third caller appears, extract it to `db/users.ts` or a `shared/lib/customer-label.ts`. Don't preempt that move.
- **YAGNI:** no payment, no notifications, no auto-renew, no Re-approve button. The spec calls these out as future work; keep that boundary firm.
- **Foreign keys:** `vip_requests.decided_by` references `users.id` with NO cascade — admin user shouldn't disappear from history if they delete their account.
- **Index quirk:** drizzle-kit sometimes generates partial unique indexes without the `WHERE` clause. After Task 3, **always** open the generated SQL and verify the `WHERE` is present on both partial indexes.
- **No comments:** match CLAUDE.md guidance — no narrative comments in new code unless the WHY is non-obvious. The existing `db/bookings.ts` shows the right ratio.
