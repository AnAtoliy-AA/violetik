# Admin Users Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/admin/users` — list every user, change role inline, attach an admin-only note, grant/revoke VIP (with optional no-expiry), and merge two rows that represent the same human signed in via both Telegram and Google.

**Architecture:** Server components for routes (under `app/[locale]/admin/users/...`), Drizzle queries in `db/users-admin.ts`, client interactives + server actions in `features/users-admin/`. Reuses existing `requireAdmin()` gate. VIP grants are written directly to the existing `vip_requests` table as `status='approved'` (lifetime VIPs = NULL `expires_at`). Account merge runs in a single Drizzle transaction that re-points every FK before deleting the loser row.

**Tech Stack:** Next.js 16 App Router (no `src/`), React 19, TypeScript strict, Tailwind v4, next-intl (`en`/`ru`/`by`), next-themes, Drizzle ORM + postgres, Vitest + Testing Library + jsdom, Storybook (`@storybook/nextjs-vite`), Playwright (e2e on port 3100), Husky pre-commit (lint + test) and pre-push (build).

**Spec:** [docs/superpowers/specs/2026-05-24-admin-users-management-design.md](../specs/2026-05-24-admin-users-management-design.md)

---

## Conventions used in this plan

- **TDD red→green.** Write the failing test before the implementation.
- **Tests are DB-null-tolerant.** The Vitest suite runs without `DATABASE_URL`. `db === null` in tests, so query functions should early-return `null` / `[]` and the tests assert that contract (see `db/vip-requests.test.ts` for the canonical example). Real DB behavior is covered by e2e against the dev server's seeded DB.
- **Feature slice layout** mirrors `features/vip-requests-admin/`:
  - `features/users-admin/api/actions.ts` — `"use server"` server actions; one file is fine for this scope.
  - `features/users-admin/api/actions.test.ts` — unit tests for actions (DB-null tolerant).
  - `features/users-admin/ui/<component>.tsx` — one client component per file.
  - `features/users-admin/ui/<component>.test.tsx` + `.stories.tsx` — mandatory per [.claude/skills/new-ui-component/SKILL.md](../../../.claude/skills/new-ui-component/SKILL.md).
  - `features/users-admin/index.ts` — public API.
- **Pages** are server components in `app/[locale]/admin/users/...`, calling `requireAdmin()` and reading via `db/users-admin.ts`. Match the structure of [app/[locale]/admin/vip-requests/page.tsx](../../../app/[locale]/admin/vip-requests/page.tsx).
- **Imports.** Use `@/i18n/navigation` (not `next/link` / `next/navigation`). Import features through the slice root (`@/features/users-admin`), never `@/features/users-admin/ui/...` from outside the slice.
- **Translations.** Every new key MUST be added to all three of `messages/en.json`, `messages/ru.json`, `messages/by.json`. Tests that mount client components in jsdom wrap with `NextIntlClientProvider` if they read translations directly; otherwise pass translated strings as props (see `RequestActions` in `features/vip-requests-admin/ui/request-actions.tsx` — labels come in as props).
- **Pre-commit / pre-push.** Pre-commit hook runs `lint` + `test`. Pre-push hook runs `build`. Don't `--no-verify`; if a hook fails, fix the root cause.
- **Commit per task.** Each task ends with a commit so progress is reviewable; small, focused commits are preferred over one big one.

---

## File map (created vs. modified)

### Created
- `db/migrations/0015_users_admin_note.sql`
- `db/users-admin.ts`
- `db/users-admin.test.ts`
- `features/users-admin/api/actions.ts`
- `features/users-admin/api/actions.test.ts`
- `features/users-admin/ui/role-toggle.tsx`
- `features/users-admin/ui/role-toggle.test.tsx`
- `features/users-admin/ui/role-toggle.stories.tsx`
- `features/users-admin/ui/admin-note-form.tsx`
- `features/users-admin/ui/admin-note-form.test.tsx`
- `features/users-admin/ui/admin-note-form.stories.tsx`
- `features/users-admin/ui/vip-grant-form.tsx`
- `features/users-admin/ui/vip-grant-form.test.tsx`
- `features/users-admin/ui/vip-grant-form.stories.tsx`
- `features/users-admin/ui/vip-revoke-button.tsx`
- `features/users-admin/ui/vip-revoke-button.test.tsx`
- `features/users-admin/ui/vip-revoke-button.stories.tsx`
- `features/users-admin/ui/suggested-merges.tsx`
- `features/users-admin/ui/suggested-merges.test.tsx`
- `features/users-admin/ui/suggested-merges.stories.tsx`
- `features/users-admin/ui/merge-form.tsx`
- `features/users-admin/ui/merge-form.test.tsx`
- `features/users-admin/ui/merge-form.stories.tsx`
- `features/users-admin/index.ts`
- `app/[locale]/admin/users/page.tsx`
- `app/[locale]/admin/users/[id]/page.tsx`
- `app/[locale]/admin/users/[id]/merge/[otherId]/page.tsx`
- `e2e/admin-users.spec.ts`

### Modified
- `db/schema.ts` — add `adminNote` column to `users` table.
- `db/vip-requests.ts` — NULL-expiry semantics in `getCurrentTier`, `listActiveVips`, `listExpiredVipRequests`, `countExpiredVipRequests`.
- `db/vip-requests.test.ts` — DB-null assertions for the new behavior (real semantics covered by e2e).
- `app/[locale]/admin/page.tsx` — add the "Users" inbox tile.
- `messages/en.json`, `messages/ru.json`, `messages/by.json` — `AdminUsers` namespace + new `Admin.inbox_users*` keys.

---

## Task 1 — DB migration & schema for `admin_note`

**Files:**
- Create: `db/migrations/0015_users_admin_note.sql`
- Modify: `db/schema.ts` (add `adminNote` to `users`)

- [ ] **Step 1: Write the SQL migration**

Create `db/migrations/0015_users_admin_note.sql`:

```sql
-- Admin-only free-text annotation per user. Nullable; visible only on /admin/users.
ALTER TABLE users ADD COLUMN admin_note text;
```

- [ ] **Step 2: Add the column to the Drizzle schema**

Edit [db/schema.ts](../../../db/schema.ts) inside the `users` `pgTable` definition (alongside `photoUrl`, `role`, etc.):

```ts
adminNote: text("admin_note"),
```

No new index — admin-notes aren't queried.

- [ ] **Step 3: Verify the schema change compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Re-run the unit tests to confirm nothing regressed**

Run: `npm test`
Expected: existing 631 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/0015_users_admin_note.sql db/schema.ts
git commit -m "feat(db): add users.admin_note column"
```

---

## Task 2 — VIP NULL-expiry semantics

**Goal:** Treat `vip_requests.expires_at IS NULL` (combined with `status='approved'`) as a lifetime VIP. This is the schema-free half of "grant VIP without expiry."

**Files:**
- Modify: `db/vip-requests.ts`
- Modify: `db/vip-requests.test.ts`

- [ ] **Step 1: Add the failing test cases**

Append to `db/vip-requests.test.ts`:

```ts
describe("lifetime VIP (expiresAt IS NULL) semantics", () => {
  // DB is null in unit tests; these assert the public contract still
  // gracefully degrades. Real NULL behavior is covered by e2e.
  it("getCurrentTier still returns member when db is null", async () => {
    const result = await getCurrentTier("tg:1");
    expect(result.state).toBe("member");
  });
  it("listActiveVips returns [] when db is null", async () => {
    expect(await listActiveVips()).toEqual([]);
  });
  it("listExpiredVipRequests returns [] when db is null", async () => {
    expect(await listExpiredVipRequests({ limit: 10, offset: 0 })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they pass already (we'll edit implementations next)**

Run: `npx vitest run db/vip-requests.test.ts`
Expected: PASS (these are contract-level guarantees).

- [ ] **Step 3: Update `getCurrentTier`**

In [db/vip-requests.ts](../../../db/vip-requests.ts), change the `activeVip` predicate:

```ts
const activeVip = rows.find(
  (r) =>
    r.status === "approved" &&
    (r.expiresAt === null || r.expiresAt > now),
);
if (activeVip) {
  return {
    state: "vip",
    activeRequestId: activeVip.id,
    expiresAt: activeVip.expiresAt, // may be null for lifetime
  };
}
```

Update the `CurrentTier` type so the `vip` branch's `expiresAt` is `Date | null` instead of `Date`:

```ts
export type CurrentTier =
  | { state: "member" }
  | { state: "member-pending"; pendingRequestId: string }
  | { state: "vip"; activeRequestId: string; expiresAt: Date | null };
```

- [ ] **Step 4: Update `listActiveVips`**

Use `isNull` from `drizzle-orm` to include lifetime rows, and sort `NULLS LAST`:

```ts
import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";

// inside listActiveVips:
.where(
  and(
    eq(schema.vipRequests.status, "approved"),
    or(
      isNull(schema.vipRequests.expiresAt),
      gt(schema.vipRequests.expiresAt, now),
    ),
  ),
)
.orderBy(sql`${schema.vipRequests.expiresAt} ASC NULLS LAST`);
```

- [ ] **Step 5: Update `listExpiredVipRequests` and `countExpiredVipRequests`**

Both must exclude NULL `expiresAt`. NULL `lte` NULL is never true in Postgres, so existing `lte(expires_at, now)` already excludes them — confirm by reading the queries and (only if necessary) add `isNotNull` for clarity:

```ts
// listExpiredVipRequests + countExpiredVipRequests
.where(
  and(
    eq(schema.vipRequests.status, "approved"),
    lte(schema.vipRequests.expiresAt, now),
    // lte already excludes NULL; no extra clause needed.
  ),
)
```

No behavior change needed if you're confident in Postgres's NULL semantics for `lte`. Leave as-is; mention it in the commit message.

- [ ] **Step 6: Type-fix any callers**

`features/vip-requests-admin/ui/active-vip-row.tsx` and `app/[locale]/admin/vip-requests/page.tsx` currently use `r.expiresAt!` and `daysFromNow(r.expiresAt!)`. After Task 2's type change these still compile (the `!` non-null assertion is still legal), but you should add a runtime branch in `active-vip-row.tsx` and the admin vip-requests page so lifetime rows render as `"lifetime"` instead of an NaN-days countdown:

In `app/[locale]/admin/vip-requests/page.tsx`, replace the active VIP row's `expires_in_days` label with:

```tsx
<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
  {r.expiresAt
    ? t("expires_in_days", { n: daysFromNow(r.expiresAt) })
    : t("expires_lifetime")}
</div>
```

Add `"expires_lifetime": "lifetime"` (en) / `"навсегда"` (ru) / `"назаўсёды"` (by) to the `AdminVipRequests` namespace.

- [ ] **Step 7: Run all tests + lint**

Run: `npm run lint && npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add db/vip-requests.ts db/vip-requests.test.ts app/[locale]/admin/vip-requests/page.tsx messages/
git commit -m "feat(vip): treat NULL expires_at as lifetime VIP"
```

---

## Task 3 — `db/users-admin.ts` skeleton + `listUsers` / `countUsers`

**Files:**
- Create: `db/users-admin.ts`
- Create: `db/users-admin.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `db/users-admin.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { listUsers, countUsers, getUserDetail } from "./users-admin";

describe("listUsers (db is null in unit tests)", () => {
  it("returns [] when db is null, regardless of filters", async () => {
    expect(await listUsers({ q: "", role: "all", vip: "all", page: 1 })).toEqual([]);
    expect(await listUsers({ q: "violetta", role: "admin", vip: "active", page: 3 })).toEqual([]);
  });
});

describe("countUsers (db is null in unit tests)", () => {
  it("returns 0 when db is null", async () => {
    expect(await countUsers({ q: "", role: "all", vip: "all" })).toBe(0);
  });
});

describe("getUserDetail (db is null in unit tests)", () => {
  it("returns null when db is null", async () => {
    expect(await getUserDetail("tg:1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run db/users-admin.test.ts`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 3: Create the skeleton with `listUsers`, `countUsers`, `getUserDetail`**

Create `db/users-admin.ts`:

```ts
import { and, desc, eq, ilike, isNull, isNotNull, or, sql } from "drizzle-orm";
import { db, schema } from "./index";

export const USERS_PAGE_SIZE = 20;

export type RoleFilter = "all" | "admin" | "customer";
export type VipFilter = "all" | "active" | "none";

export interface ListUsersInput {
  q: string;
  role: RoleFilter;
  vip: VipFilter;
  page: number;
}

export interface UserListRow {
  id: string;
  telegramId: number | null;
  googleSub: string | null;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  role: "customer" | "admin";
  createdAt: Date;
  lastSignInAt: Date | null;
  adminNote: string | null;
  vipState: "none" | "active" | "lifetime"; // joined from vip_requests
  vipExpiresAt: Date | null;
}

function buildBaseFilters(input: Pick<ListUsersInput, "q" | "role">) {
  const filters = [] as Array<ReturnType<typeof eq>>;
  if (input.role !== "all") {
    filters.push(eq(schema.users.role, input.role));
  }
  if (input.q.trim()) {
    const pattern = `%${input.q.trim()}%`;
    filters.push(
      or(
        ilike(schema.users.id, pattern),
        ilike(schema.users.email, pattern),
        ilike(schema.users.firstName, pattern),
        ilike(schema.users.lastName, pattern),
        ilike(schema.users.username, pattern),
      )!,
    );
  }
  return filters;
}

/**
 * Subquery yielding (user_id, active_request_id, expires_at) for every user
 * with an unexpired approved VIP row. Used as a LEFT JOIN so we can
 * decorate every row with a VIP flag in a single round-trip.
 */
function vipSubquery() {
  // Returns drizzle subquery; built inside callers so it's scoped to db.
  // ...see usage below.
}

export async function listUsers(input: ListUsersInput): Promise<UserListRow[]> {
  if (!db) return [];
  const now = new Date();
  const page = Math.max(1, Math.floor(input.page));
  const offset = (page - 1) * USERS_PAGE_SIZE;

  const activeVip = db
    .select({
      userId: schema.vipRequests.userId,
      id: schema.vipRequests.id,
      expiresAt: schema.vipRequests.expiresAt,
    })
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          sql`${schema.vipRequests.expiresAt} > ${now}`,
        ),
      ),
    )
    .as("active_vip");

  const baseFilters = buildBaseFilters({ q: input.q, role: input.role });
  if (input.vip === "active") {
    baseFilters.push(isNotNull(activeVip.userId)!);
  } else if (input.vip === "none") {
    baseFilters.push(isNull(activeVip.userId)!);
  }

  const rows = await db
    .select({
      user: schema.users,
      vipUserId: activeVip.userId,
      vipExpiresAt: activeVip.expiresAt,
    })
    .from(schema.users)
    .leftJoin(activeVip, eq(activeVip.userId, schema.users.id))
    .where(baseFilters.length ? and(...baseFilters) : undefined)
    .orderBy(desc(schema.users.lastSignInAt), desc(schema.users.createdAt))
    .limit(USERS_PAGE_SIZE)
    .offset(offset);

  return rows.map((r) => ({
    id: r.user.id,
    telegramId: r.user.telegramId,
    googleSub: r.user.googleSub,
    email: r.user.email,
    username: r.user.username,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    photoUrl: r.user.photoUrl,
    role: r.user.role,
    createdAt: r.user.createdAt,
    lastSignInAt: r.user.lastSignInAt,
    adminNote: r.user.adminNote,
    vipState: !r.vipUserId
      ? "none"
      : r.vipExpiresAt === null
        ? "lifetime"
        : "active",
    vipExpiresAt: r.vipExpiresAt,
  }));
}

export async function countUsers(
  input: Omit<ListUsersInput, "page">,
): Promise<number> {
  if (!db) return 0;
  const now = new Date();

  const activeVip = db
    .select({ userId: schema.vipRequests.userId })
    .from(schema.vipRequests)
    .where(
      and(
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          sql`${schema.vipRequests.expiresAt} > ${now}`,
        ),
      ),
    )
    .as("active_vip");

  const baseFilters = buildBaseFilters({ q: input.q, role: input.role });
  if (input.vip === "active") baseFilters.push(isNotNull(activeVip.userId)!);
  if (input.vip === "none") baseFilters.push(isNull(activeVip.userId)!);

  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.users)
    .leftJoin(activeVip, eq(activeVip.userId, schema.users.id))
    .where(baseFilters.length ? and(...baseFilters) : undefined);

  return rows[0]?.n ?? 0;
}

export interface UserDetail extends UserListRow {
  bookingCount: number;
  testimonialPendingCount: number;
  testimonialApprovedCount: number;
  pendingVipRequestId: string | null;
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  if (!db) return null;

  const userRow = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  const user = userRow[0];
  if (!user) return null;

  const [bookingRows, pendingRow, approvedRow, activeRow, pendingVipRow] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.bookings)
        .where(eq(schema.bookings.userId, id)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.testimonials)
        .where(
          and(
            eq(schema.testimonials.userId, id),
            eq(schema.testimonials.status, "pending"),
          ),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.testimonials)
        .where(
          and(
            eq(schema.testimonials.userId, id),
            eq(schema.testimonials.status, "approved"),
          ),
        ),
      db
        .select({
          id: schema.vipRequests.id,
          expiresAt: schema.vipRequests.expiresAt,
        })
        .from(schema.vipRequests)
        .where(
          and(
            eq(schema.vipRequests.userId, id),
            eq(schema.vipRequests.status, "approved"),
            or(
              isNull(schema.vipRequests.expiresAt),
              sql`${schema.vipRequests.expiresAt} > ${new Date()}`,
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: schema.vipRequests.id })
        .from(schema.vipRequests)
        .where(
          and(
            eq(schema.vipRequests.userId, id),
            eq(schema.vipRequests.status, "pending"),
          ),
        )
        .limit(1),
    ]);

  const active = activeRow[0];

  return {
    id: user.id,
    telegramId: user.telegramId,
    googleSub: user.googleSub,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    role: user.role,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
    adminNote: user.adminNote,
    vipState: !active
      ? "none"
      : active.expiresAt === null
        ? "lifetime"
        : "active",
    vipExpiresAt: active?.expiresAt ?? null,
    bookingCount: bookingRows[0]?.n ?? 0,
    testimonialPendingCount: pendingRow[0]?.n ?? 0,
    testimonialApprovedCount: approvedRow[0]?.n ?? 0,
    pendingVipRequestId: pendingVipRow[0]?.id ?? null,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run db/users-admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): listUsers, countUsers, getUserDetail for admin"
```

---

## Task 4 — `setUserRole` + last-admin guard

**Files:**
- Modify: `db/users-admin.ts`
- Modify: `db/users-admin.test.ts`

- [ ] **Step 1: Append the failing test**

Add to `db/users-admin.test.ts`:

```ts
import { setUserRole } from "./users-admin";

describe("setUserRole (db is null in unit tests)", () => {
  it("returns the not-found shape gracefully when db is null", async () => {
    const result = await setUserRole("tg:1", "admin");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["last-admin", "not-found"]).toContain(result.reason);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run db/users-admin.test.ts`
Expected: FAIL (`setUserRole` not exported).

- [ ] **Step 3: Implement `setUserRole`**

Append to `db/users-admin.ts`:

```ts
export type SetUserRoleResult =
  | { ok: true; user: schema.User }
  | { ok: false; reason: "last-admin" | "not-found" };

export async function setUserRole(
  id: string,
  role: "customer" | "admin",
): Promise<SetUserRoleResult> {
  if (!db) return { ok: false, reason: "not-found" };

  if (role === "customer") {
    // Refuse to demote the last admin. Run inside a single read so the
    // race with a concurrent "promote new admin" is the only window —
    // acceptable for a single-studio admin surface.
    const currentRows = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    const current = currentRows[0]?.role;
    if (current === "admin") {
      const counts = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));
      if ((counts[0]?.n ?? 0) <= 1) return { ok: false, reason: "last-admin" };
    }
  }

  const rows = await db
    .update(schema.users)
    .set({ role })
    .where(eq(schema.users.id, id))
    .returning();
  const user = rows[0];
  if (!user) return { ok: false, reason: "not-found" };
  return { ok: true, user };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run db/users-admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): setUserRole with last-admin guard"
```

---

## Task 5 — `setAdminNote`

**Files:**
- Modify: `db/users-admin.ts`
- Modify: `db/users-admin.test.ts`

- [ ] **Step 1: Append the failing test**

```ts
import { setAdminNote } from "./users-admin";

describe("setAdminNote (db is null in unit tests)", () => {
  it("returns null when db is null", async () => {
    expect(await setAdminNote("tg:1", "hello")).toBeNull();
    expect(await setAdminNote("tg:1", null)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `setAdminNote`**

Append to `db/users-admin.ts`:

```ts
export async function setAdminNote(
  id: string,
  note: string | null,
): Promise<schema.User | null> {
  if (!db) return null;
  const trimmed = note === null ? null : note.trim() === "" ? null : note;
  const rows = await db
    .update(schema.users)
    .set({ adminNote: trimmed })
    .where(eq(schema.users.id, id))
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run db/users-admin.test.ts
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): setAdminNote"
```

---

## Task 6 — `grantVip` + `revokeVip`

**Files:**
- Modify: `db/users-admin.ts`
- Modify: `db/users-admin.test.ts`

- [ ] **Step 1: Append the failing tests**

```ts
import { grantVip, revokeVip } from "./users-admin";

describe("grantVip (db is null in unit tests)", () => {
  it("returns null for fixed expiry when db is null", async () => {
    expect(
      await grantVip({
        userId: "tg:1",
        expiresAt: new Date(Date.now() + 30 * 86400_000),
        decidedBy: "tg:admin",
      }),
    ).toBeNull();
  });

  it("returns null for lifetime when db is null", async () => {
    expect(
      await grantVip({ userId: "tg:1", expiresAt: null, decidedBy: "tg:admin" }),
    ).toBeNull();
  });
});

describe("revokeVip (db is null in unit tests)", () => {
  it("returns null when db is null", async () => {
    expect(await revokeVip("tg:1")).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

Append to `db/users-admin.ts`:

```ts
import { randomBytes } from "node:crypto";

export interface GrantVipInput {
  userId: string;
  expiresAt: Date | null; // null = lifetime
  decidedBy: string;
}

/**
 * Admin-side VIP grant: writes a `status='approved'` row directly to
 * vip_requests. If a pending request exists for the user, cancels it
 * first to avoid the `vip_requests_one_pending_per_user` index. Wrapped
 * in a transaction so cancel+grant are atomic.
 */
export async function grantVip(
  input: GrantVipInput,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const newId = `vipreq_${randomBytes(8).toString("hex")}`;

  return await db.transaction(async (tx) => {
    // Cancel any pending request (idempotent — no-op if none).
    await tx
      .update(schema.vipRequests)
      .set({ status: "cancelled", decidedAt: now, decidedBy: input.decidedBy })
      .where(
        and(
          eq(schema.vipRequests.userId, input.userId),
          eq(schema.vipRequests.status, "pending"),
        ),
      );

    const rows = await tx
      .insert(schema.vipRequests)
      .values({
        id: newId,
        userId: input.userId,
        status: "approved",
        decidedAt: now,
        decidedBy: input.decidedBy,
        expiresAt: input.expiresAt,
      })
      .returning();
    return rows[0] ?? null;
  });
}

/**
 * Revokes whatever active VIP the user has (timed or lifetime). For
 * lifetime rows this sets expires_at to now, ending VIP immediately.
 * No-op if no active VIP. Returns the affected row, if any.
 */
export async function revokeVip(
  userId: string,
): Promise<schema.VipRequest | null> {
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .update(schema.vipRequests)
    .set({ expiresAt: now })
    .where(
      and(
        eq(schema.vipRequests.userId, userId),
        eq(schema.vipRequests.status, "approved"),
        or(
          isNull(schema.vipRequests.expiresAt),
          sql`${schema.vipRequests.expiresAt} > ${now}`,
        ),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run db/users-admin.test.ts
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): grantVip + revokeVip with lifetime support"
```

---

## Task 7 — `suggestMergeCandidates`

**Files:**
- Modify: `db/users-admin.ts`
- Modify: `db/users-admin.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { suggestMergeCandidates } from "./users-admin";

describe("suggestMergeCandidates (db is null in unit tests)", () => {
  it("returns [] for scope=all when db is null", async () => {
    expect(await suggestMergeCandidates({ scope: "all" })).toEqual([]);
  });
  it("returns [] for scope=for when db is null", async () => {
    expect(
      await suggestMergeCandidates({ scope: "for", userId: "tg:1" }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

Append to `db/users-admin.ts`:

```ts
export type MergeSignal = "email" | "photo" | "name" | "tg-google-handle";

export interface MergeCandidate {
  a: schema.User; // lexicographically smaller id (so pair is stable)
  b: schema.User;
  score: number;
  signals: MergeSignal[];
}

export type SuggestMergeInput =
  | { scope: "all" }
  | { scope: "for"; userId: string };

const SIGNAL_WEIGHT: Record<MergeSignal, number> = {
  email: 4,
  photo: 3,
  name: 2,
  "tg-google-handle": 1,
};

const SIGNAL_THRESHOLD = 2; // emit only if pair scores >= 2
const SITEWIDE_CAP = 50;

/**
 * Returns ordered cross-provider (tg:* + google:*) pairs that look like
 * the same human. Computed in app code rather than SQL — the user
 * volume for a studio is small, and the scoring is easier to read /
 * test in TS.
 */
export async function suggestMergeCandidates(
  input: SuggestMergeInput,
): Promise<MergeCandidate[]> {
  if (!db) return [];

  // Pull all users (small dataset for a studio). Future optimization:
  // pre-filter by likely-match SQL when volume grows.
  const users = await db.select().from(schema.users);

  const tg = users.filter((u) => u.id.startsWith("tg:"));
  const google = users.filter((u) => u.id.startsWith("google:"));

  const candidates: MergeCandidate[] = [];

  for (const t of tg) {
    for (const g of google) {
      // scope: "for" restricts to pairs involving the focus user.
      if (input.scope === "for" && t.id !== input.userId && g.id !== input.userId) {
        continue;
      }

      const signals: MergeSignal[] = [];
      const tEmail = t.email?.trim().toLowerCase();
      const gEmail = g.email?.trim().toLowerCase();
      if (tEmail && gEmail && tEmail === gEmail) signals.push("email");
      if (t.photoUrl && g.photoUrl && t.photoUrl === g.photoUrl) {
        signals.push("photo");
      }
      const tFirst = t.firstName?.toLowerCase();
      const tLast = t.lastName?.toLowerCase();
      const gFirst = g.firstName?.toLowerCase();
      const gLast = g.lastName?.toLowerCase();
      if (tFirst && tLast && tFirst === gFirst && tLast === gLast) {
        signals.push("name");
      }
      const tUsername = t.username?.toLowerCase();
      const gLocal = gEmail?.split("@")[0];
      if (tUsername && gLocal && tUsername === gLocal) {
        signals.push("tg-google-handle");
      }

      const score = signals.reduce((s, sig) => s + SIGNAL_WEIGHT[sig], 0);
      if (score < SIGNAL_THRESHOLD) continue;

      // Stable ordering by lexicographic id (so URLs are deterministic).
      const [a, b] = t.id < g.id ? [t, g] : [g, t];
      candidates.push({ a, b, score, signals });
    }
  }

  candidates.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    const lx = Math.max(
      x.a.lastSignInAt?.getTime() ?? 0,
      x.b.lastSignInAt?.getTime() ?? 0,
    );
    const ly = Math.max(
      y.a.lastSignInAt?.getTime() ?? 0,
      y.b.lastSignInAt?.getTime() ?? 0,
    );
    return ly - lx;
  });

  if (input.scope === "all") return candidates.slice(0, SITEWIDE_CAP);
  return candidates; // per-user is bounded by definition
}
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run db/users-admin.test.ts
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): suggestMergeCandidates"
```

---

## Task 8 — `getMergeConflicts`

**Files:**
- Modify: `db/users-admin.ts`
- Modify: `db/users-admin.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { getMergeConflicts } from "./users-admin";

describe("getMergeConflicts (db is null in unit tests)", () => {
  it("returns the empty shape when db is null", async () => {
    expect(await getMergeConflicts("tg:1", "google:abc")).toEqual({
      bothPendingVip: false,
      pendingTestimonialCollisions: [],
    });
  });
});
```

- [ ] **Step 2: Implement**

Append to `db/users-admin.ts`:

```ts
import { inArray } from "drizzle-orm";

export interface MergeConflicts {
  bothPendingVip: boolean;
  pendingTestimonialCollisions: string[]; // master_ids
}

export async function getMergeConflicts(
  idA: string,
  idB: string,
): Promise<MergeConflicts> {
  if (!db) {
    return { bothPendingVip: false, pendingTestimonialCollisions: [] };
  }

  const [vipRows, testimonialRows] = await Promise.all([
    db
      .select({ userId: schema.vipRequests.userId })
      .from(schema.vipRequests)
      .where(
        and(
          eq(schema.vipRequests.status, "pending"),
          inArray(schema.vipRequests.userId, [idA, idB]),
        ),
      ),
    db
      .select({
        userId: schema.testimonials.userId,
        masterId: schema.testimonials.masterId,
      })
      .from(schema.testimonials)
      .where(
        and(
          eq(schema.testimonials.status, "pending"),
          inArray(schema.testimonials.userId, [idA, idB]),
        ),
      ),
  ]);

  const pendingUsers = new Set(vipRows.map((r) => r.userId));
  const bothPendingVip = pendingUsers.has(idA) && pendingUsers.has(idB);

  const byMaster = new Map<string, Set<string>>();
  for (const t of testimonialRows) {
    if (!byMaster.has(t.masterId)) byMaster.set(t.masterId, new Set());
    byMaster.get(t.masterId)!.add(t.userId);
  }
  const pendingTestimonialCollisions: string[] = [];
  for (const [masterId, users] of byMaster) {
    if (users.has(idA) && users.has(idB)) {
      pendingTestimonialCollisions.push(masterId);
    }
  }

  return { bothPendingVip, pendingTestimonialCollisions };
}
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run db/users-admin.test.ts
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): getMergeConflicts pre-flight check"
```

---

## Task 9 — `mergeUsers` (transactional)

**Files:**
- Modify: `db/users-admin.ts`
- Modify: `db/users-admin.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { mergeUsers } from "./users-admin";

describe("mergeUsers (db is null in unit tests)", () => {
  it("returns the not-found shape when db is null", async () => {
    const result = await mergeUsers({
      survivorId: "tg:1",
      loserId: "google:abc",
      overrides: {
        firstName: "survivor",
        lastName: "survivor",
        email: "survivor",
        photoUrl: "survivor",
      },
      auditByAdmin: "tg:admin",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["conflicts", "not-found"]).toContain(result.reason);
    }
  });
});
```

- [ ] **Step 2: Implement**

Append to `db/users-admin.ts`:

```ts
export type OverrideSource = "survivor" | "loser";

export interface MergeUsersInput {
  survivorId: string;
  loserId: string;
  overrides: {
    firstName: OverrideSource;
    lastName: OverrideSource;
    email: OverrideSource;
    photoUrl: OverrideSource;
  };
  auditByAdmin: string;
}

export type MergeUsersResult =
  | { ok: true; survivorId: string }
  | { ok: false; reason: "not-found" | "conflicts"; conflicts?: MergeConflicts };

function pickOverride<T>(
  source: OverrideSource,
  survivorValue: T,
  loserValue: T,
): T {
  return source === "survivor" ? survivorValue : loserValue;
}

export async function mergeUsers(
  input: MergeUsersInput,
): Promise<MergeUsersResult> {
  if (!db) return { ok: false, reason: "not-found" };
  if (input.survivorId === input.loserId) {
    return { ok: false, reason: "not-found" };
  }

  // Defence-in-depth conflict check before opening the transaction.
  const conflicts = await getMergeConflicts(input.survivorId, input.loserId);
  if (
    conflicts.bothPendingVip ||
    conflicts.pendingTestimonialCollisions.length > 0
  ) {
    return { ok: false, reason: "conflicts", conflicts };
  }

  return await db.transaction(async (tx) => {
    const [survivorRows, loserRows] = await Promise.all([
      tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, input.survivorId))
        .limit(1),
      tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, input.loserId))
        .limit(1),
    ]);
    const survivor = survivorRows[0];
    const loser = loserRows[0];
    if (!survivor || !loser) {
      // Rollback by throwing — Drizzle aborts the transaction.
      throw new Error("MERGE_NOT_FOUND");
    }

    // 1. Re-point FK references from loser → survivor.
    //    (google_oauth_tokens.userId is a PK; handled below.)
    await Promise.all([
      tx
        .update(schema.bookings)
        .set({ userId: input.survivorId })
        .where(eq(schema.bookings.userId, input.loserId)),
      tx
        .update(schema.vipRequests)
        .set({ userId: input.survivorId })
        .where(eq(schema.vipRequests.userId, input.loserId)),
      tx
        .update(schema.vipRequests)
        .set({ decidedBy: input.survivorId })
        .where(eq(schema.vipRequests.decidedBy, input.loserId)),
      tx
        .update(schema.testimonials)
        .set({ userId: input.survivorId })
        .where(eq(schema.testimonials.userId, input.loserId)),
      tx
        .update(schema.testimonials)
        .set({ decidedBy: input.survivorId })
        .where(eq(schema.testimonials.decidedBy, input.loserId)),
      tx
        .update(schema.siteSettings)
        .set({ updatedBy: input.survivorId })
        .where(eq(schema.siteSettings.updatedBy, input.loserId)),
      tx
        .update(schema.serviceCategories)
        .set({ updatedBy: input.survivorId })
        .where(eq(schema.serviceCategories.updatedBy, input.loserId)),
      tx
        .update(schema.services)
        .set({ updatedBy: input.survivorId })
        .where(eq(schema.services.updatedBy, input.loserId)),
      tx
        .update(schema.studioPhotos)
        .set({ uploadedBy: input.survivorId })
        .where(eq(schema.studioPhotos.uploadedBy, input.loserId)),
    ]);

    // 2. google_oauth_tokens.userId is a PK with onDelete cascade.
    const survivorTokens = await tx
      .select({ userId: schema.googleOauthTokens.userId })
      .from(schema.googleOauthTokens)
      .where(eq(schema.googleOauthTokens.userId, input.survivorId))
      .limit(1);
    if (survivorTokens.length === 0) {
      // Survivor has no row — re-point the loser's row (if any) to survivor.
      await tx
        .update(schema.googleOauthTokens)
        .set({ userId: input.survivorId })
        .where(eq(schema.googleOauthTokens.userId, input.loserId));
    } else {
      // Survivor already has tokens; the loser's row would conflict on PK.
      // Drop the loser's row before deleting the loser user (cascade would
      // do this anyway, but being explicit makes the intent obvious).
      await tx
        .delete(schema.googleOauthTokens)
        .where(eq(schema.googleOauthTokens.userId, input.loserId));
    }

    // 3. Absorb provider id + per-field overrides onto the survivor row.
    const patch: Partial<typeof schema.users.$inferInsert> = {};
    if (!survivor.telegramId && loser.telegramId) {
      patch.telegramId = loser.telegramId;
    }
    if (!survivor.googleSub && loser.googleSub) {
      patch.googleSub = loser.googleSub;
    }
    patch.firstName = pickOverride(
      input.overrides.firstName,
      survivor.firstName,
      loser.firstName,
    );
    patch.lastName = pickOverride(
      input.overrides.lastName,
      survivor.lastName,
      loser.lastName,
    );
    patch.email = pickOverride(
      input.overrides.email,
      survivor.email,
      loser.email,
    );
    patch.photoUrl = pickOverride(
      input.overrides.photoUrl,
      survivor.photoUrl,
      loser.photoUrl,
    );

    // 4. Append an audit line to admin_note.
    const today = new Date().toISOString().slice(0, 10);
    const auditLine = `[merged ${today} — absorbed ${input.loserId} by ${input.auditByAdmin}]`;
    patch.adminNote = survivor.adminNote
      ? `${auditLine}\n\n${survivor.adminNote}`
      : auditLine;

    await tx
      .update(schema.users)
      .set(patch)
      .where(eq(schema.users.id, input.survivorId));

    // 5. Delete loser row. All FKs are migrated above, so the cascade
    //    has nothing to destroy.
    await tx.delete(schema.users).where(eq(schema.users.id, input.loserId));

    return { ok: true as const, survivorId: input.survivorId };
  }).catch((err): MergeUsersResult => {
    if (err instanceof Error && err.message === "MERGE_NOT_FOUND") {
      return { ok: false, reason: "not-found" };
    }
    throw err;
  });
}
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run db/users-admin.test.ts
git add db/users-admin.ts db/users-admin.test.ts
git commit -m "feat(db): mergeUsers transactional re-point + delete"
```

---

## Task 10 — Server actions in `features/users-admin/api/actions.ts`

**Files:**
- Create: `features/users-admin/api/actions.ts`
- Create: `features/users-admin/api/actions.test.ts`

- [ ] **Step 1: Failing tests**

Create `features/users-admin/api/actions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  setUserRoleAction,
  setAdminNoteAction,
  grantVipAction,
  revokeVipAction,
  mergeUsersAction,
} from "./actions";

// requireAdmin will deny in unit tests (no session). Each action should
// surface the gate result rather than crash.
describe("users-admin server actions deny when not admin", () => {
  it("setUserRoleAction returns unauthorized/forbidden when no session", async () => {
    const r = await setUserRoleAction("tg:1", "admin");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["unauthorized", "forbidden"]).toContain(r.reason);
  });
  it("setAdminNoteAction returns unauthorized/forbidden when no session", async () => {
    const r = await setAdminNoteAction("tg:1", "hi");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["unauthorized", "forbidden"]).toContain(r.reason);
  });
  it("grantVipAction returns unauthorized/forbidden when no session", async () => {
    const r = await grantVipAction({ userId: "tg:1", expiresAt: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["unauthorized", "forbidden"]).toContain(r.reason);
  });
  it("revokeVipAction returns unauthorized/forbidden when no session", async () => {
    const r = await revokeVipAction("tg:1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["unauthorized", "forbidden"]).toContain(r.reason);
  });
  it("mergeUsersAction returns unauthorized/forbidden when no session", async () => {
    const r = await mergeUsersAction({
      survivorId: "tg:1",
      loserId: "google:abc",
      overrides: {
        firstName: "survivor",
        lastName: "survivor",
        email: "survivor",
        photoUrl: "survivor",
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["unauthorized", "forbidden"]).toContain(r.reason);
  });
});
```

- [ ] **Step 2: Implement**

Create `features/users-admin/api/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  setUserRole,
  setAdminNote,
  grantVip,
  revokeVip,
  mergeUsers,
  type OverrideSource,
  type MergeConflicts,
} from "@/db/users-admin";

type AuthFail = { ok: false; reason: "unauthorized" | "forbidden" };

export type SetRoleActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "last-admin" | "not-found" };

export async function setUserRoleAction(
  id: string,
  role: "customer" | "admin",
): Promise<SetRoleActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const result = await setUserRole(id, role);
  if (!result.ok) return { ok: false, reason: result.reason };
  revalidatePath("/", "layout");
  return { ok: true, id: result.user.id };
}

export type SetNoteActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "not-found" };

export async function setAdminNoteAction(
  id: string,
  note: string | null,
): Promise<SetNoteActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const user = await setAdminNote(id, note);
  if (!user) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: user.id };
}

export type GrantVipActionInput = {
  userId: string;
  expiresAt: Date | null; // null = lifetime
};

export type GrantVipActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "not-found" };

export async function grantVipAction(
  input: GrantVipActionInput,
): Promise<GrantVipActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await grantVip({
    userId: input.userId,
    expiresAt: input.expiresAt,
    decidedBy: gate.user.id,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export type RevokeVipActionResult =
  | { ok: true; id: string }
  | AuthFail
  | { ok: false; reason: "not-found" };

export async function revokeVipAction(
  userId: string,
): Promise<RevokeVipActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await revokeVip(userId);
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export type MergeActionInput = {
  survivorId: string;
  loserId: string;
  overrides: {
    firstName: OverrideSource;
    lastName: OverrideSource;
    email: OverrideSource;
    photoUrl: OverrideSource;
  };
};

export type MergeActionResult =
  | { ok: true; survivorId: string }
  | AuthFail
  | {
      ok: false;
      reason: "not-found" | "conflicts";
      conflicts?: MergeConflicts;
    };

export async function mergeUsersAction(
  input: MergeActionInput,
): Promise<MergeActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const result = await mergeUsers({
    ...input,
    auditByAdmin: gate.user.id,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason, conflicts: result.conflicts };
  }
  revalidatePath("/", "layout");
  return { ok: true, survivorId: result.survivorId };
}
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run features/users-admin/api/actions.test.ts
git add features/users-admin/api/actions.ts features/users-admin/api/actions.test.ts
git commit -m "feat(users-admin): server actions with admin gate"
```

---

## Task 11 — `RoleToggle` component (client, inline list edit)

**Files:**
- Create: `features/users-admin/ui/role-toggle.tsx`
- Create: `features/users-admin/ui/role-toggle.test.tsx`
- Create: `features/users-admin/ui/role-toggle.stories.tsx`

Use [features/vip-requests-admin/ui/request-actions.tsx](../../../features/vip-requests-admin/ui/request-actions.tsx) as the structural reference for client server-action usage.

- [ ] **Step 1: Write the failing test**

```tsx
// role-toggle.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RoleToggle } from "./role-toggle";

describe("RoleToggle", () => {
  it("renders both options with the current one selected", () => {
    render(
      <RoleToggle
        userId="tg:1"
        role="customer"
        customerLabel="Customer"
        adminLabel="Admin"
        lastAdminErrorLabel="Cannot demote last admin"
      />,
    );
    const customer = screen.getByRole("radio", { name: "Customer" });
    expect(customer).toBeChecked();
    const admin = screen.getByRole("radio", { name: "Admin" });
    expect(admin).not.toBeChecked();
  });

  it("calls onChange handler when toggled (smoke)", () => {
    const onSubmit = vi.fn();
    render(
      <RoleToggle
        userId="tg:1"
        role="customer"
        customerLabel="Customer"
        adminLabel="Admin"
        lastAdminErrorLabel="Cannot demote last admin"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Admin" }));
    expect(onSubmit).toHaveBeenCalledWith("admin");
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// role-toggle.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { setUserRoleAction } from "../api/actions";
import { cn } from "@/shared/lib/cn";

export interface RoleToggleProps {
  userId: string;
  role: "customer" | "admin";
  customerLabel: string;
  adminLabel: string;
  lastAdminErrorLabel: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (role: "customer" | "admin") => void;
}

export function RoleToggle(props: RoleToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(props.role);

  function submit(next: "customer" | "admin") {
    if (props.onSubmit) {
      props.onSubmit(next);
      setCurrent(next);
      return;
    }
    startTransition(async () => {
      const result = await setUserRoleAction(props.userId, next);
      if (!result.ok) {
        if (result.reason === "last-admin") setError(props.lastAdminErrorLabel);
        return;
      }
      setError(null);
      setCurrent(next);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Role"
      className="inline-flex rounded-full border border-line bg-surface-1 p-0.5 text-[11px]"
    >
      {(["customer", "admin"] as const).map((value) => {
        const label = value === "customer" ? props.customerLabel : props.adminLabel;
        const checked = current === value;
        return (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={checked}
            aria-label={label}
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              if (!checked) submit(value);
            }}
            className={cn(
              "rounded-full px-3 py-1 font-mono uppercase tracking-[0.18em] transition-colors duration-fast",
              checked ? "bg-gold text-bg" : "text-text-2",
            )}
          >
            {label}
          </button>
        );
      })}
      {error ? (
        <span className="ml-2 self-center text-[10px] text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
```

Note: if [shared/lib/cn.ts](../../../shared/lib/cn.ts) doesn't exist, use `clsx` directly (it's in dependencies). Check the codebase pattern first — most components in `features/vip-requests-admin` build classNames inline.

- [ ] **Step 3: Storybook story**

```tsx
// role-toggle.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RoleToggle } from "./role-toggle";

const meta: Meta<typeof RoleToggle> = {
  component: RoleToggle,
  args: {
    userId: "tg:demo",
    customerLabel: "Customer",
    adminLabel: "Admin",
    lastAdminErrorLabel: "Cannot demote last admin",
    onSubmit: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof RoleToggle>;
export const Customer: Story = { args: { role: "customer" } };
export const Admin: Story = { args: { role: "admin" } };
```

- [ ] **Step 4: Run + commit**

```bash
npx vitest run features/users-admin/ui/role-toggle.test.tsx
git add features/users-admin/ui/role-toggle.*
git commit -m "feat(users-admin): RoleToggle inline list control"
```

---

## Task 12 — `AdminNoteForm`

**Files:**
- Create: `features/users-admin/ui/admin-note-form.tsx`
- Create: `features/users-admin/ui/admin-note-form.test.tsx`
- Create: `features/users-admin/ui/admin-note-form.stories.tsx`

- [ ] **Step 1: Failing test**

```tsx
// admin-note-form.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminNoteForm } from "./admin-note-form";

describe("AdminNoteForm", () => {
  it("renders initial value and calls onSubmit with edited value", () => {
    const onSubmit = vi.fn();
    render(
      <AdminNoteForm
        userId="tg:1"
        initialNote="hello"
        helperLabel="Only admins see this."
        saveLabel="Save"
        savedLabel="Saved"
        onSubmit={onSubmit}
      />,
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("hello");
    fireEvent.change(textarea, { target: { value: "world" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith("world");
  });

  it("submits null when textarea is cleared", () => {
    const onSubmit = vi.fn();
    render(
      <AdminNoteForm
        userId="tg:1"
        initialNote="hello"
        helperLabel="Only admins see this."
        saveLabel="Save"
        savedLabel="Saved"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// admin-note-form.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { setAdminNoteAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface AdminNoteFormProps {
  userId: string;
  initialNote: string | null;
  helperLabel: string;
  saveLabel: string;
  savedLabel: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (note: string | null) => void;
}

export function AdminNoteForm(props: AdminNoteFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(props.initialNote ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function submit(): void {
    const next = value.trim() === "" ? null : value;
    if (props.onSubmit) {
      props.onSubmit(next);
      setSavedAt(Date.now());
      return;
    }
    startTransition(async () => {
      const result = await setAdminNoteAction(props.userId, next);
      if (result.ok) {
        setSavedAt(Date.now());
        router.refresh();
      }
    });
  }

  return (
    <form
      action={() => submit()}
      className="flex flex-col gap-2"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full rounded-[12px] border border-line bg-surface-1 p-3 text-[14px]"
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {props.helperLabel}
        </span>
        <div className="flex items-center gap-3">
          {savedAt ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              {props.savedLabel}
            </span>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            {props.saveLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Story + commit**

```tsx
// admin-note-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AdminNoteForm } from "./admin-note-form";

const meta: Meta<typeof AdminNoteForm> = {
  component: AdminNoteForm,
  args: {
    userId: "tg:demo",
    helperLabel: "Only admins see this.",
    saveLabel: "Save",
    savedLabel: "Saved",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof AdminNoteForm>;
export const Empty: Story = { args: { initialNote: null } };
export const WithNote: Story = {
  args: { initialNote: "Spent over €2k last year. Prefers Mariya." },
};
```

```bash
npx vitest run features/users-admin/ui/admin-note-form.test.tsx
git add features/users-admin/ui/admin-note-form.*
git commit -m "feat(users-admin): AdminNoteForm"
```

---

## Task 13 — `VipGrantForm`

**Files:**
- Create: `features/users-admin/ui/vip-grant-form.tsx`
- Create: `features/users-admin/ui/vip-grant-form.test.tsx`
- Create: `features/users-admin/ui/vip-grant-form.stories.tsx`

- [ ] **Step 1: Failing test**

```tsx
// vip-grant-form.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VipGrantForm } from "./vip-grant-form";

describe("VipGrantForm", () => {
  it("submits the chosen ISO date when no-expiry is off", () => {
    const onSubmit = vi.fn();
    render(
      <VipGrantForm
        userId="tg:1"
        defaultExpiry="2026-06-23"
        untilLabel="Expires on"
        noExpiryLabel="No expiry"
        grantLabel="Grant VIP"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Grant VIP" }));
    expect(onSubmit).toHaveBeenCalledWith({ expiresAt: "2026-06-23" });
  });

  it("submits no-expiry when checkbox is on", () => {
    const onSubmit = vi.fn();
    render(
      <VipGrantForm
        userId="tg:1"
        defaultExpiry="2026-06-23"
        untilLabel="Expires on"
        noExpiryLabel="No expiry"
        grantLabel="Grant VIP"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByLabelText("No expiry"));
    fireEvent.click(screen.getByRole("button", { name: "Grant VIP" }));
    expect(onSubmit).toHaveBeenCalledWith({ expiresAt: null });
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// vip-grant-form.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { grantVipAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface VipGrantFormProps {
  userId: string;
  defaultExpiry: string; // YYYY-MM-DD
  untilLabel: string;
  noExpiryLabel: string;
  grantLabel: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (input: { expiresAt: string | null }) => void;
}

export function VipGrantForm(props: VipGrantFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expiry, setExpiry] = useState(props.defaultExpiry);
  const [noExpiry, setNoExpiry] = useState(false);

  function submit() {
    const isoOrNull = noExpiry ? null : expiry;
    if (props.onSubmit) {
      props.onSubmit({ expiresAt: isoOrNull });
      return;
    }
    startTransition(async () => {
      const result = await grantVipAction({
        userId: props.userId,
        expiresAt: isoOrNull ? new Date(`${isoOrNull}T00:00:00Z`) : null,
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <form
      action={() => submit()}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {props.untilLabel}
        </span>
        <input
          type="date"
          value={expiry}
          disabled={noExpiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="rounded-[10px] border border-line bg-surface-1 px-3 py-2 text-[13px]"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={noExpiry}
          onChange={(e) => setNoExpiry(e.target.checked)}
        />
        {props.noExpiryLabel}
      </label>
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "primary", size: "sm" })}
      >
        {props.grantLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Story + commit**

```tsx
// vip-grant-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VipGrantForm } from "./vip-grant-form";

const meta: Meta<typeof VipGrantForm> = {
  component: VipGrantForm,
  args: {
    userId: "tg:demo",
    defaultExpiry: "2026-06-23",
    untilLabel: "Expires on",
    noExpiryLabel: "No expiry",
    grantLabel: "Grant VIP",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof VipGrantForm>;
export const Default: Story = {};
```

```bash
npx vitest run features/users-admin/ui/vip-grant-form.test.tsx
git add features/users-admin/ui/vip-grant-form.*
git commit -m "feat(users-admin): VipGrantForm with lifetime toggle"
```

---

## Task 14 — `VipRevokeButton`

**Files:**
- Create: `features/users-admin/ui/vip-revoke-button.tsx`
- Create: `features/users-admin/ui/vip-revoke-button.test.tsx`
- Create: `features/users-admin/ui/vip-revoke-button.stories.tsx`

- [ ] **Step 1: Failing test**

```tsx
// vip-revoke-button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VipRevokeButton } from "./vip-revoke-button";

describe("VipRevokeButton", () => {
  it("calls onSubmit when clicked", () => {
    const onSubmit = vi.fn();
    render(
      <VipRevokeButton userId="tg:1" label="Revoke VIP" onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Revoke VIP" }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// vip-revoke-button.tsx
"use client";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { revokeVipAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface VipRevokeButtonProps {
  userId: string;
  label: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: () => void;
}

export function VipRevokeButton(props: VipRevokeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() => {
        if (props.onSubmit) return props.onSubmit();
        startTransition(async () => {
          const r = await revokeVipAction(props.userId);
          if (r.ok) router.refresh();
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "outline", size: "sm" })}
      >
        {props.label}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Story + commit**

```tsx
// vip-revoke-button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VipRevokeButton } from "./vip-revoke-button";

const meta: Meta<typeof VipRevokeButton> = {
  component: VipRevokeButton,
  args: { userId: "tg:demo", label: "Revoke VIP", onSubmit: () => {} },
};
export default meta;
type Story = StoryObj<typeof VipRevokeButton>;
export const Default: Story = {};
```

```bash
npx vitest run features/users-admin/ui/vip-revoke-button.test.tsx
git add features/users-admin/ui/vip-revoke-button.*
git commit -m "feat(users-admin): VipRevokeButton"
```

---

## Task 15 — `SuggestedMerges` (list-page section)

**Files:**
- Create: `features/users-admin/ui/suggested-merges.tsx`
- Create: `features/users-admin/ui/suggested-merges.test.tsx`
- Create: `features/users-admin/ui/suggested-merges.stories.tsx`

This component renders pairs from `suggestMergeCandidates()`. The page passes already-fetched candidates as props (the component stays pure — easier to test, easier to story).

- [ ] **Step 1: Failing test**

```tsx
// suggested-merges.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SuggestedMerges } from "./suggested-merges";

describe("SuggestedMerges", () => {
  it("renders nothing when there are no candidates", () => {
    const { container } = render(
      <SuggestedMerges
        title="Suggested merges"
        reviewLabel="Review merge"
        signalLabels={{
          email: "email",
          photo: "photo",
          name: "name",
          "tg-google-handle": "handle",
        }}
        candidates={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one row per candidate with linked review URL", () => {
    render(
      <SuggestedMerges
        title="Suggested merges"
        reviewLabel="Review merge"
        signalLabels={{
          email: "email",
          photo: "photo",
          name: "name",
          "tg-google-handle": "handle",
        }}
        candidates={[
          {
            a: {
              id: "google:abc",
              displayName: "Violetta",
              photoUrl: null,
            },
            b: {
              id: "tg:1",
              displayName: "Violetta",
              photoUrl: null,
            },
            score: 6,
            signals: ["email", "name"],
          },
        ]}
      />,
    );
    expect(screen.getByText("Suggested merges")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Review merge/i }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/admin/users/google:abc/merge/tg:1"),
    );
  });
});
```

- [ ] **Step 2: Implement (no `"use client"` — pure render)**

```tsx
// suggested-merges.tsx
import { Link } from "@/i18n/navigation";
import type { MergeSignal } from "@/db/users-admin";

export interface SuggestedMergeUser {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

export interface SuggestedMergeRow {
  a: SuggestedMergeUser;
  b: SuggestedMergeUser;
  score: number;
  signals: MergeSignal[];
}

export interface SuggestedMergesProps {
  title: string;
  reviewLabel: string;
  signalLabels: Record<MergeSignal, string>;
  candidates: SuggestedMergeRow[];
}

export function SuggestedMerges(props: SuggestedMergesProps) {
  if (props.candidates.length === 0) return null;

  return (
    <section className="px-[22px] pb-6">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {props.title}
      </h2>
      <ul className="flex flex-col gap-2">
        {props.candidates.map((row) => (
          <li
            key={`${row.a.id}::${row.b.id}`}
            className="gilded flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-[16px] italic">
                {row.a.displayName}
              </span>
              <span className="text-text-3">↔</span>
              <span className="font-display text-[16px] italic">
                {row.b.displayName}
              </span>
              <span className="ml-3 flex gap-1">
                {row.signals.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3"
                  >
                    {props.signalLabels[s]}
                  </span>
                ))}
              </span>
            </div>
            <Link
              href={`/admin/users/${row.a.id}/merge/${row.b.id}`}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
            >
              {props.reviewLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Story + commit**

```tsx
// suggested-merges.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SuggestedMerges } from "./suggested-merges";

const meta: Meta<typeof SuggestedMerges> = {
  component: SuggestedMerges,
  args: {
    title: "Suggested merges",
    reviewLabel: "Review merge",
    signalLabels: {
      email: "email match",
      photo: "photo match",
      name: "name match",
      "tg-google-handle": "handle match",
    },
  },
};
export default meta;
type Story = StoryObj<typeof SuggestedMerges>;
export const Empty: Story = { args: { candidates: [] } };
export const TwoPairs: Story = {
  args: {
    candidates: [
      {
        a: { id: "google:abc", displayName: "Violetta", photoUrl: null },
        b: { id: "tg:1", displayName: "Violetta", photoUrl: null },
        score: 6,
        signals: ["email", "name"],
      },
      {
        a: { id: "google:def", displayName: "Marina", photoUrl: null },
        b: { id: "tg:2", displayName: "Marina", photoUrl: null },
        score: 3,
        signals: ["photo"],
      },
    ],
  },
};
```

```bash
npx vitest run features/users-admin/ui/suggested-merges.test.tsx
git add features/users-admin/ui/suggested-merges.*
git commit -m "feat(users-admin): SuggestedMerges list section"
```

---

## Task 16 — `MergeForm` (confirmation page)

**Files:**
- Create: `features/users-admin/ui/merge-form.tsx`
- Create: `features/users-admin/ui/merge-form.test.tsx`
- Create: `features/users-admin/ui/merge-form.stories.tsx`

- [ ] **Step 1: Failing test (smoke + override selection)**

```tsx
// merge-form.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MergeForm } from "./merge-form";

const baseProps = {
  conflicts: { bothPendingVip: false, pendingTestimonialCollisions: [] as string[] },
  survivorRadioLabel: "Survivor",
  overrideLabels: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    photoUrl: "Photo",
  },
  conflictPendingVipLabel: "Both have a pending VIP",
  conflictPendingTestimonialLabel: "Both have a pending testimonial",
  mergeLabel: "Merge",
  cancelLabel: "Cancel",
  cancelHref: "/admin/users/google:abc",
  a: {
    id: "google:abc",
    firstName: "Vi",
    lastName: "G",
    email: "v@x",
    photoUrl: "https://a",
  },
  b: {
    id: "tg:1",
    firstName: "Vi",
    lastName: "T",
    email: null,
    photoUrl: null,
  },
};

describe("MergeForm", () => {
  it("submits the chosen survivor + overrides", () => {
    const onSubmit = vi.fn();
    render(<MergeForm {...baseProps} onSubmit={onSubmit} />);
    // Default survivor = a; flip lastName override to loser
    fireEvent.click(screen.getByLabelText(/Last name.*tg:1/i));
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    expect(onSubmit).toHaveBeenCalledWith({
      survivorId: "google:abc",
      loserId: "tg:1",
      overrides: {
        firstName: "survivor",
        lastName: "loser",
        email: "survivor",
        photoUrl: "survivor",
      },
    });
  });

  it("disables the merge button when conflicts present", () => {
    render(
      <MergeForm
        {...baseProps}
        conflicts={{ bothPendingVip: true, pendingTestimonialCollisions: [] }}
      />,
    );
    expect(screen.getByRole("button", { name: "Merge" })).toBeDisabled();
    expect(screen.getByText("Both have a pending VIP")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// merge-form.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { mergeUsersAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";
import type { OverrideSource } from "@/db/users-admin";

type FieldKey = "firstName" | "lastName" | "email" | "photoUrl";

export interface MergeFormUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  photoUrl: string | null;
}

export interface MergeFormConflicts {
  bothPendingVip: boolean;
  pendingTestimonialCollisions: string[];
}

export interface MergeFormProps {
  a: MergeFormUser;
  b: MergeFormUser;
  conflicts: MergeFormConflicts;
  survivorRadioLabel: string;
  overrideLabels: Record<FieldKey, string>;
  conflictPendingVipLabel: string;
  conflictPendingTestimonialLabel: string;
  mergeLabel: string;
  cancelLabel: string;
  cancelHref: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (input: {
    survivorId: string;
    loserId: string;
    overrides: Record<FieldKey, OverrideSource>;
  }) => void;
}

export function MergeForm(props: MergeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [survivorId, setSurvivorId] = useState(props.a.id);
  const [overrides, setOverrides] = useState<Record<FieldKey, OverrideSource>>({
    firstName: "survivor",
    lastName: "survivor",
    email: "survivor",
    photoUrl: "survivor",
  });

  const survivor = survivorId === props.a.id ? props.a : props.b;
  const loser = survivorId === props.a.id ? props.b : props.a;

  const hasConflict =
    props.conflicts.bothPendingVip ||
    props.conflicts.pendingTestimonialCollisions.length > 0;

  function submit() {
    const payload = {
      survivorId: survivor.id,
      loserId: loser.id,
      overrides,
    };
    if (props.onSubmit) return props.onSubmit(payload);
    startTransition(async () => {
      const r = await mergeUsersAction({
        survivorId: payload.survivorId,
        loserId: payload.loserId,
        overrides: payload.overrides,
      });
      if (r.ok) {
        router.push(`/admin/users/${r.survivorId}`);
        router.refresh();
      }
    });
  }

  return (
    <form action={() => submit()} className="flex flex-col gap-6">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {props.survivorRadioLabel}
        </legend>
        {[props.a, props.b].map((u) => (
          <label
            key={u.id}
            className="gilded flex cursor-pointer items-start gap-3 rounded-[14px] p-4"
          >
            <input
              type="radio"
              name="survivor"
              value={u.id}
              checked={survivorId === u.id}
              onChange={() => setSurvivorId(u.id)}
            />
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {u.id}
              </div>
              <div className="font-display text-[18px] italic">
                {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="text-[12px] text-text-2">{u.email ?? "—"}</div>
            </div>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        {(["firstName", "lastName", "email", "photoUrl"] as FieldKey[]).map((field) => (
          <div key={field}>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
              {props.overrideLabels[field]}
            </div>
            <div className="mt-1 flex gap-3 text-[13px]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={`override-${field}`}
                  checked={overrides[field] === "survivor"}
                  onChange={() =>
                    setOverrides((o) => ({ ...o, [field]: "survivor" }))
                  }
                  aria-label={`${props.overrideLabels[field]} from ${survivor.id}`}
                />
                <span className="text-text-2">
                  {survivor[field] ?? "—"}{" "}
                  <span className="text-text-3">({survivor.id})</span>
                </span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={`override-${field}`}
                  checked={overrides[field] === "loser"}
                  onChange={() =>
                    setOverrides((o) => ({ ...o, [field]: "loser" }))
                  }
                  aria-label={`${props.overrideLabels[field]} from ${loser.id}`}
                />
                <span className="text-text-2">
                  {loser[field] ?? "—"}{" "}
                  <span className="text-text-3">({loser.id})</span>
                </span>
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      {hasConflict ? (
        <ul className="flex flex-col gap-2 rounded-[12px] border border-red-500/50 bg-red-500/10 p-4 text-[13px]">
          {props.conflicts.bothPendingVip ? (
            <li>{props.conflictPendingVipLabel}</li>
          ) : null}
          {props.conflicts.pendingTestimonialCollisions.length > 0 ? (
            <li>{props.conflictPendingTestimonialLabel}</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending || hasConflict}
          className={buttonClassName({ variant: "primary", size: "md" })}
        >
          {props.mergeLabel}
        </button>
        <Link
          href={props.cancelHref}
          className={buttonClassName({ variant: "outline", size: "md" })}
        >
          {props.cancelLabel}
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Story + commit**

```tsx
// merge-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MergeForm } from "./merge-form";

const meta: Meta<typeof MergeForm> = {
  component: MergeForm,
  args: {
    a: { id: "google:abc", firstName: "Vi", lastName: "G", email: "v@x.com", photoUrl: "https://a" },
    b: { id: "tg:1", firstName: "Vi", lastName: "T", email: null, photoUrl: null },
    conflicts: { bothPendingVip: false, pendingTestimonialCollisions: [] },
    survivorRadioLabel: "Survivor",
    overrideLabels: {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      photoUrl: "Photo URL",
    },
    conflictPendingVipLabel: "Both rows have a pending VIP request — cancel one first.",
    conflictPendingTestimonialLabel: "Both rows have a pending testimonial for the same master.",
    mergeLabel: "Merge",
    cancelLabel: "Cancel",
    cancelHref: "/admin/users/google:abc",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof MergeForm>;
export const NoConflicts: Story = {};
export const WithConflicts: Story = {
  args: {
    conflicts: { bothPendingVip: true, pendingTestimonialCollisions: ["m1"] },
  },
};
```

```bash
npx vitest run features/users-admin/ui/merge-form.test.tsx
git add features/users-admin/ui/merge-form.*
git commit -m "feat(users-admin): MergeForm with conflict warnings"
```

---

## Task 17 — Public API `features/users-admin/index.ts`

**Files:**
- Create: `features/users-admin/index.ts`

- [ ] **Step 1: Create the barrel**

```ts
// index.ts
export { RoleToggle } from "./ui/role-toggle";
export { AdminNoteForm } from "./ui/admin-note-form";
export { VipGrantForm } from "./ui/vip-grant-form";
export { VipRevokeButton } from "./ui/vip-revoke-button";
export { SuggestedMerges } from "./ui/suggested-merges";
export { MergeForm } from "./ui/merge-form";

export type {
  SuggestedMergeRow,
  SuggestedMergeUser,
} from "./ui/suggested-merges";
export type { MergeFormUser, MergeFormConflicts } from "./ui/merge-form";

export {
  setUserRoleAction,
  setAdminNoteAction,
  grantVipAction,
  revokeVipAction,
  mergeUsersAction,
} from "./api/actions";
export type {
  SetRoleActionResult,
  SetNoteActionResult,
  GrantVipActionResult,
  RevokeVipActionResult,
  MergeActionResult,
} from "./api/actions";
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add features/users-admin/index.ts
git commit -m "feat(users-admin): public API barrel"
```

---

## Task 18 — i18n keys (en + ru + by)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `messages/by.json`

The keys must exist in all three files before the pages import them — otherwise next-intl throws at runtime and `npm run build` fails (pre-push hook).

- [ ] **Step 1: Add the `AdminUsers` namespace in `messages/en.json`**

Insert after the `AdminTestimonials` block:

```json
"AdminUsers": {
  "meta_title": "Users",
  "plate_title": "Users",
  "eyebrow": "Private · Studio admin",
  "hero_title": "Who walks through the door.",
  "hero_paragraph": "Every customer who has ever signed in. Change roles, attach notes, grant VIP, and merge duplicates across Telegram and Google.",
  "section_suggested_merges": "Suggested merges",
  "search_placeholder": "Search by name, email, username, or id",
  "filter_role_label": "Role",
  "filter_role_all": "All",
  "filter_role_admin": "Admins",
  "filter_role_customer": "Customers",
  "filter_vip_label": "VIP",
  "filter_vip_all": "All",
  "filter_vip_active": "Active VIP",
  "filter_vip_none": "Not VIP",
  "role_customer": "Customer",
  "role_admin": "Admin",
  "role_last_admin_error": "Cannot demote the last admin.",
  "vip_state_member": "Member",
  "vip_state_active": "VIP · expires {date}",
  "vip_state_lifetime": "VIP · lifetime",
  "last_seen_never": "never signed in",
  "last_seen_ago": "{date}",
  "empty_list": "No users match these filters.",
  "pagination_prev": "← Previous",
  "pagination_next": "Next →",
  "pagination_summary": "Showing {from}–{to} of {total}",
  "signal_email": "email match",
  "signal_photo": "photo match",
  "signal_name": "name match",
  "signal_handle": "handle match",
  "review_merge": "Review merge",
  "detail": {
    "section_identity": "Identity",
    "section_role": "Role",
    "section_note": "Admin note",
    "section_vip": "VIP",
    "section_bookings": "Bookings",
    "section_testimonials": "Testimonials",
    "section_duplicates": "Possible duplicates",
    "identity_created": "Created {date}",
    "identity_last_seen": "Last seen {date}",
    "note_only_admin": "Only admins see this.",
    "note_save": "Save",
    "note_saved": "Saved",
    "vip_grant_until": "Expires on",
    "vip_grant_no_expiry": "No expiry",
    "vip_grant_cta": "Grant VIP",
    "vip_revoke_cta": "Revoke VIP",
    "bookings_count": "{n} bookings",
    "bookings_link": "All bookings →",
    "testimonials_pending": "{n} pending",
    "testimonials_approved": "{n} approved",
    "duplicates_empty": "No likely duplicates."
  },
  "merge": {
    "meta_title": "Merge users",
    "plate_title": "Merge users",
    "intro": "Pick which row survives and how its profile should look. The other row is deleted; every booking, VIP request, testimonial, and edit it owns is reassigned to the survivor.",
    "survivor_label": "Survivor",
    "override_first_name": "First name",
    "override_last_name": "Last name",
    "override_email": "Email",
    "override_photo": "Photo URL",
    "conflict_pending_vip": "Both rows have a pending VIP request. Cancel one on /admin/vip-requests first.",
    "conflict_pending_testimonial": "Both rows have a pending testimonial for the same master. Decide one on /admin/testimonials first.",
    "cta_merge": "Merge",
    "cta_cancel": "Cancel"
  }
}
```

Also add to the existing `Admin` namespace:

```json
"inbox_users": "Users",
"inbox_users_caption": "List, role, VIP, merge"
```

- [ ] **Step 2: Mirror the keys in `messages/ru.json` and `messages/by.json`**

Translate each value into Russian and Belarusian. If you don't know the translation for a key, mirror the English value — that's still better than crashing at build time. The studio's existing translations follow the same pattern across all three files.

Suggested translations (use these unless you find better in the existing files):

| en | ru | by |
|---|---|---|
| "Users" | "Пользователи" | "Карыстальнікі" |
| "Customer" | "Клиент" | "Кліент" |
| "Admin" | "Админ" | "Адмін" |
| "Member" | "Участник" | "Удзельнік" |
| "VIP · expires {date}" | "VIP · до {date}" | "VIP · да {date}" |
| "VIP · lifetime" | "VIP · навсегда" | "VIP · назаўсёды" |
| "All" | "Все" | "Усе" |
| "Search by name, email, username, or id" | "Поиск по имени, e-mail, логину или id" | "Пошук па імені, e-mail, лагіне ці id" |
| "Grant VIP" | "Выдать VIP" | "Выдаць VIP" |
| "Revoke VIP" | "Снять VIP" | "Зняць VIP" |
| "No expiry" | "Без срока" | "Без тэрміну" |
| "Expires on" | "До" | "Да" |
| "Save" | "Сохранить" | "Захаваць" |
| "Saved" | "Сохранено" | "Захавана" |
| "Only admins see this." | "Видно только админам." | "Бачна толькі адмінам." |
| "Suggested merges" | "Возможные объединения" | "Магчымыя аб'яднанні" |
| "Review merge" | "Открыть объединение" | "Адкрыць аб'яднанне" |
| "Merge" | "Объединить" | "Аб'яднаць" |
| "Cancel" | "Отмена" | "Адмена" |

- [ ] **Step 3: Verify next-intl picks up the new namespace**

Run: `npm test`
Expected: PASS (existing tests should still load all three locales without issue).

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): AdminUsers namespace in en/ru/by"
```

---

## Task 19 — List page `/admin/users`

**Files:**
- Create: `app/[locale]/admin/users/page.tsx`

Use [app/[locale]/admin/vip-requests/page.tsx](../../../app/[locale]/admin/vip-requests/page.tsx) as the structural reference.

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  listUsers,
  countUsers,
  suggestMergeCandidates,
  USERS_PAGE_SIZE,
  type RoleFilter,
  type VipFilter,
} from "@/db/users-admin";
import {
  RoleToggle,
  SuggestedMerges,
  type SuggestedMergeRow,
} from "@/features/users-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };
type Search = {
  q?: string;
  role?: string;
  vip?: string;
  page?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminUsers" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function parseRole(raw: string | undefined): RoleFilter {
  return raw === "admin" || raw === "customer" ? raw : "all";
}
function parseVip(raw: string | undefined): VipFilter {
  return raw === "active" || raw === "none" ? raw : "all";
}
function parsePage(raw: string | undefined): number {
  const n = Number(raw ?? "1");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function displayName(u: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  id: string;
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.username || u.email || u.id;
}

export default async function AdminUsersRoute({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const q = (search.q ?? "").trim();
  const role = parseRole(search.role);
  const vip = parseVip(search.vip);
  const page = parsePage(search.page);

  const [users, total, suggestions] = await Promise.all([
    listUsers({ q, role, vip, page }),
    countUsers({ q, role, vip }),
    suggestMergeCandidates({ scope: "all" }),
  ]);

  const t = await getTranslations("AdminUsers");

  const suggestRows: SuggestedMergeRow[] = suggestions.slice(0, 5).map((c) => ({
    a: {
      id: c.a.id,
      displayName: displayName(c.a),
      photoUrl: c.a.photoUrl,
    },
    b: {
      id: c.b.id,
      displayName: displayName(c.b),
      photoUrl: c.b.photoUrl,
    },
    score: c.score,
    signals: c.signals,
  }));

  const from = (page - 1) * USERS_PAGE_SIZE + (users.length === 0 ? 0 : 1);
  const to = (page - 1) * USERS_PAGE_SIZE + users.length;

  const baseQuery = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (role !== "all") sp.set("role", role);
    if (vip !== "all") sp.set("vip", vip);
    if (page > 1) sp.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "" || v === "all" || v === "1") sp.delete(k);
      else sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">{t("hero_paragraph")}</p>
      </section>

      <SuggestedMerges
        title={t("section_suggested_merges")}
        reviewLabel={t("review_merge")}
        signalLabels={{
          email: t("signal_email"),
          photo: t("signal_photo"),
          name: t("signal_name"),
          "tg-google-handle": t("signal_handle"),
        }}
        candidates={suggestRows}
      />

      <section className="px-[22px] pb-4">
        <form
          method="get"
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("search_placeholder")}
            className="flex-1 min-w-[200px] rounded-[10px] border border-line bg-surface-1 px-3 py-2 text-[13px]"
          />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="vip" value={vip} />
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "admin", "customer"] as RoleFilter[]).map((r) => (
            <Link
              key={r}
              href={`/admin/users${baseQuery({ role: r, page: "1" })}`}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                role === r ? "border-gold text-gold" : "border-line text-text-3"
              }`}
            >
              {t(`filter_role_${r}` as const)}
            </Link>
          ))}
          {(["all", "active", "none"] as VipFilter[]).map((v) => (
            <Link
              key={v}
              href={`/admin/users${baseQuery({ vip: v, page: "1" })}`}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                vip === v ? "border-gold text-gold" : "border-line text-text-3"
              }`}
            >
              {t(`filter_vip_${v}` as const)}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-[22px] pb-6">
        {users.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_list")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {users.map((u) => (
              <li key={u.id} className="gilded rounded-[12px] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex-1 min-w-[200px]"
                  >
                    <div className="font-display text-[18px] italic">
                      {displayName(u)}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                      {u.id} ·{" "}
                      {u.vipState === "lifetime"
                        ? t("vip_state_lifetime")
                        : u.vipState === "active"
                          ? t("vip_state_active", {
                              date: u.vipExpiresAt!.toISOString().slice(0, 10),
                            })
                          : t("vip_state_member")}
                    </div>
                  </Link>
                  <RoleToggle
                    userId={u.id}
                    role={u.role}
                    customerLabel={t("role_customer")}
                    adminLabel={t("role_admin")}
                    lastAdminErrorLabel={t("role_last_admin_error")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between text-[12px] text-text-3">
          <span>{t("pagination_summary", { from, to, total })}</span>
          <span className="flex gap-3">
            {page > 1 ? (
              <Link href={`/admin/users${baseQuery({ page: String(page - 1) })}`}>
                {t("pagination_prev")}
              </Link>
            ) : null}
            {to < total ? (
              <Link href={`/admin/users${baseQuery({ page: String(page + 1) })}`}>
                {t("pagination_next")}
              </Link>
            ) : null}
          </span>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Run lint + tests**

```bash
npm run lint && npm test
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/admin/users/page.tsx
git commit -m "feat(admin): /admin/users list page"
```

---

## Task 20 — Detail page `/admin/users/[id]`

**Files:**
- Create: `app/[locale]/admin/users/[id]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  getUserDetail,
  suggestMergeCandidates,
} from "@/db/users-admin";
import {
  RoleToggle,
  AdminNoteForm,
  VipGrantForm,
  VipRevokeButton,
  SuggestedMerges,
  type SuggestedMergeRow,
} from "@/features/users-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminUsers" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function displayName(u: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  id: string;
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.username || u.email || u.id;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminUserDetailRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const user = await getUserDetail(id);
  if (!user) notFound();

  const t = await getTranslations("AdminUsers");
  const tDetail = await getTranslations("AdminUsers.detail");

  const suggestions = await suggestMergeCandidates({ scope: "for", userId: id });
  const dupRows: SuggestedMergeRow[] = suggestions.map((c) => ({
    a: { id: c.a.id, displayName: displayName(c.a), photoUrl: c.a.photoUrl },
    b: { id: c.b.id, displayName: displayName(c.b), photoUrl: c.b.photoUrl },
    score: c.score,
    signals: c.signals,
  }));

  const defaultExpiry = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  return (
    <div className="pb-16">
      <AppHeader back="/admin/users" title={displayName(user)} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{tDetail("section_identity")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[32px] font-light italic">
          {displayName(user)}
        </h1>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {user.id}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-text-2">
          {user.telegramId !== null ? (
            <span>Telegram · @{user.username ?? "—"} (tg:{user.telegramId})</span>
          ) : null}
          {user.googleSub !== null ? (
            <span>Google · {user.email ?? "—"}</span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-text-3">
          <span>{tDetail("identity_created", { date: isoDate(user.createdAt) })}</span>
          <span>
            {user.lastSignInAt
              ? tDetail("identity_last_seen", { date: isoDate(user.lastSignInAt) })
              : t("last_seen_never")}
          </span>
        </div>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_role")}
        </h2>
        <RoleToggle
          userId={user.id}
          role={user.role}
          customerLabel={t("role_customer")}
          adminLabel={t("role_admin")}
          lastAdminErrorLabel={t("role_last_admin_error")}
        />
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_note")}
        </h2>
        <AdminNoteForm
          userId={user.id}
          initialNote={user.adminNote}
          helperLabel={tDetail("note_only_admin")}
          saveLabel={tDetail("note_save")}
          savedLabel={tDetail("note_saved")}
        />
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_vip")}
        </h2>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          {user.vipState === "lifetime"
            ? t("vip_state_lifetime")
            : user.vipState === "active"
              ? t("vip_state_active", { date: isoDate(user.vipExpiresAt!) })
              : t("vip_state_member")}
        </div>
        {user.vipState === "none" ? (
          <VipGrantForm
            userId={user.id}
            defaultExpiry={defaultExpiry}
            untilLabel={tDetail("vip_grant_until")}
            noExpiryLabel={tDetail("vip_grant_no_expiry")}
            grantLabel={tDetail("vip_grant_cta")}
          />
        ) : (
          <VipRevokeButton
            userId={user.id}
            label={tDetail("vip_revoke_cta")}
          />
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_bookings")}
        </h2>
        <div className="text-[13px] text-text-2">
          {tDetail("bookings_count", { n: user.bookingCount })}
        </div>
        <Link
          href="/admin/bookings"
          className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
        >
          {tDetail("bookings_link")}
        </Link>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_testimonials")}
        </h2>
        <div className="flex gap-4 text-[13px] text-text-2">
          <span>{tDetail("testimonials_pending", { n: user.testimonialPendingCount })}</span>
          <span>{tDetail("testimonials_approved", { n: user.testimonialApprovedCount })}</span>
        </div>
      </section>

      {dupRows.length > 0 ? (
        <SuggestedMerges
          title={tDetail("section_duplicates")}
          reviewLabel={t("review_merge")}
          signalLabels={{
            email: t("signal_email"),
            photo: t("signal_photo"),
            name: t("signal_name"),
            "tg-google-handle": t("signal_handle"),
          }}
          candidates={dupRows}
        />
      ) : (
        <section className="px-[22px] pb-6">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {tDetail("section_duplicates")}
          </h2>
          <p className="text-[13px] text-text-3">{tDetail("duplicates_empty")}</p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run lint + tests + commit**

```bash
npm run lint && npm test
git add app/[locale]/admin/users/[id]/page.tsx
git commit -m "feat(admin): /admin/users/[id] detail page"
```

---

## Task 21 — Merge page `/admin/users/[id]/merge/[otherId]`

**Files:**
- Create: `app/[locale]/admin/users/[id]/merge/[otherId]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { getUserDetail, getMergeConflicts } from "@/db/users-admin";
import { MergeForm } from "@/features/users-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string; otherId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminUsers" });
  return { title: `Violetta — ${t("merge.meta_title")}` };
}

export default async function AdminUsersMergeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id, otherId } = await params;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  if (id === otherId) notFound();

  const [a, b] = await Promise.all([getUserDetail(id), getUserDetail(otherId)]);
  if (!a || !b) notFound();

  const conflicts = await getMergeConflicts(a.id, b.id);
  const t = await getTranslations("AdminUsers");
  const tMerge = await getTranslations("AdminUsers.merge");

  return (
    <div className="pb-16">
      <AppHeader back={`/admin/users/${id}`} title={tMerge("plate_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[32px] font-light italic">
          {tMerge("plate_title")}
        </h1>
        <p className="max-w-[480px] text-[13px] text-text-2">{tMerge("intro")}</p>
      </section>

      <section className="px-[22px] pb-10">
        <MergeForm
          a={{
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
            photoUrl: a.photoUrl,
          }}
          b={{
            id: b.id,
            firstName: b.firstName,
            lastName: b.lastName,
            email: b.email,
            photoUrl: b.photoUrl,
          }}
          conflicts={conflicts}
          survivorRadioLabel={tMerge("survivor_label")}
          overrideLabels={{
            firstName: tMerge("override_first_name"),
            lastName: tMerge("override_last_name"),
            email: tMerge("override_email"),
            photoUrl: tMerge("override_photo"),
          }}
          conflictPendingVipLabel={tMerge("conflict_pending_vip")}
          conflictPendingTestimonialLabel={tMerge("conflict_pending_testimonial")}
          mergeLabel={tMerge("cta_merge")}
          cancelLabel={tMerge("cta_cancel")}
          cancelHref={`/admin/users/${id}`}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Run lint + tests + commit**

```bash
npm run lint && npm test
git add app/[locale]/admin/users/[id]/merge/[otherId]/page.tsx
git commit -m "feat(admin): /admin/users/[id]/merge/[otherId] page"
```

---

## Task 22 — Add the "Users" inbox tile on `/admin`

**Files:**
- Modify: `app/[locale]/admin/page.tsx`

- [ ] **Step 1: Add the tile**

In [app/[locale]/admin/page.tsx](../../../app/[locale]/admin/page.tsx), inside the `<ul className="grid grid-cols-2 gap-3">` block, add another `<li>` (after the "Masters" tile):

```tsx
<li>
  <Link
    href="/admin/users"
    className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
  >
    <div className="font-display text-[16px] italic">{t("inbox_users")}</div>
    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
      {t("inbox_users_caption")}
    </div>
  </Link>
</li>
```

The translation keys were added in Task 18.

- [ ] **Step 2: Lint + test + commit**

```bash
npm run lint && npm test
git add app/[locale]/admin/page.tsx
git commit -m "feat(admin): mount Users tile in inbox"
```

---

## Task 23 — Playwright e2e: `e2e/admin-users.spec.ts`

**Files:**
- Create: `e2e/admin-users.spec.ts`

The e2e suite boots its own dev server on port 3100 (`npm run e2e`). The Playwright config picks up `e2e/**/*.spec.ts`. Auth is bypassed when `TELEGRAM_BOT_TOKEN` is unset — admin pages are open in CI / local dev. That matches what other admin e2e specs assume.

Look at an existing admin e2e (`e2e/admin-*.spec.ts` if present, otherwise `e2e/home.spec.ts`) for the conventions used (locale prefix, locator strategy).

- [ ] **Step 1: Check existing admin e2e patterns**

```bash
ls e2e/
```

Read whichever admin-related spec is closest in structure (e.g. `e2e/admin-vip-requests.spec.ts` if it exists).

- [ ] **Step 2: Write the spec**

```ts
import { test, expect } from "@playwright/test";

// `npm run e2e` boots its own dev server on port 3100 with no auth gate
// (TELEGRAM_BOT_TOKEN is unset in CI), so the admin pages render directly.
test.describe("/admin/users", () => {
  test("loads the list page", async ({ page }) => {
    await page.goto("/en/admin/users");
    await expect(page).toHaveTitle(/Users/);
    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
  });

  test("role and VIP filter pills navigate via URL", async ({ page }) => {
    await page.goto("/en/admin/users");
    await page.getByRole("link", { name: "Admins" }).click();
    await expect(page).toHaveURL(/role=admin/);
    await page.getByRole("link", { name: "Active VIP" }).click();
    await expect(page).toHaveURL(/vip=active/);
  });
});
```

(The detail and merge happy-paths require a seeded DB with multiple users; if the dev env doesn't seed users, leave those out of v1 e2e — they are exercised by unit tests at the action level and the page-load smoke above proves the routes don't crash.)

- [ ] **Step 3: Run the e2e suite**

```bash
npm run e2e -- e2e/admin-users.spec.ts
```

Expected: PASS. If it fails because the dev server can't boot (port conflict with `npm run dev`), kill the foreground dev server first — Next 16 allows only one dev server per project.

- [ ] **Step 4: Commit**

```bash
git add e2e/admin-users.spec.ts
git commit -m "test(e2e): admin users list smoke"
```

---

## Task 24 — Pre-PR verification

- [ ] **Step 1: Lint**

```bash
npm run lint
```
Expected: 0 errors.

- [ ] **Step 2: Full unit suite (jsdom + Storybook browser project)**

```bash
npm test
```
Expected: all green; story-as-test for each new component passes.

- [ ] **Step 3: Build (this is the pre-push gate)**

```bash
npm run build
```
Expected: PASS. If a translation key is missing in any locale, next-intl will throw — fix in `messages/{en,ru,by}.json`.

- [ ] **Step 4: Confirm with `git status` clean and the branch summary**

```bash
git status
git log --oneline main..HEAD
```

- [ ] **Step 5: Push & open PR**

```bash
git push -u origin feature/admin-users-management
```

Use the project's `pr-description` skill to draft and open the PR (`.claude/skills/pr-description/SKILL.md`). The PR body should reference the spec at `docs/superpowers/specs/2026-05-24-admin-users-management-design.md` and list the routes added (`/admin/users`, `/admin/users/[id]`, `/admin/users/[id]/merge/[otherId]`).

---

## After-PR

If the reviewer asks for changes that touch behaviors locked in the design (algorithm weights, merge field semantics, etc.), update the spec first, then the implementation. Don't drift quietly.

If a unit test for a new function is hard to write because it really needs a live DB, that's a signal to either (a) add a DB-null tolerant smoke (matching the rest of `db/`), or (b) move the assertion into the e2e spec.

YAGNI reminder: do not add merge undo, bulk role change, or audit-log infrastructure in this PR. Those are explicitly out of scope per [the spec §2](../specs/2026-05-24-admin-users-management-design.md#2-non-goals-yagni).
