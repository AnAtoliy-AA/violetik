# Admin Masters Management — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user authorised "select recommended until PR open" — proceed autonomously.

**Goal:** Replace the hardcoded `STUDIO_DATA.artist` with a DB-backed `masters` collection that the admin can fully CRUD; show a master picker (1-master collapses to the existing hero, 2+ shows a list) on `/master`; hide services from the public menu when no published master performs them. No booking-flow changes in this phase.

**Architecture:** Mirrors the services-admin pattern shipped in PR #44/#45. New `masters` table + `master_services` join (both seeded with current Violetta state). Read pipeline at `db/masters.ts`, mutations at `db/masters-mutations.ts`, runtime entity at `entities/master/`, server actions + UI at `features/masters-admin/`, routes at `app/[locale]/admin/masters/`. The customer-facing `/master` page forks on published-master count: 1 → existing hero, 2+ → list view linking to `/master/[slug]`.

**Tech Stack:** Drizzle ORM, Postgres, Next.js 16, React 19, Tailwind v4, next-intl, Zod, Vitest, Playwright, dnd-kit (already installed via #45 for sortable lists).

**Spec:** [docs/superpowers/specs/2026-05-22-admin-masters-management-design.md](../specs/2026-05-22-admin-masters-management-design.md)

---

## File map

### New
- `db/migrations/0008_admin_masters.sql` — auto-generated DDL + manually-appended idempotent seed
- `db/masters.ts` — read pipeline
- `db/masters-mutations.ts` — write pipeline + archive-guard count helper
- `db/masters.test.ts` — db-null path + ordering
- `db/masters-mutations.test.ts` — archive guard
- `entities/master/index.ts`
- `entities/master/model/types.ts`
- `entities/master/model/schema.ts`
- `entities/master/model/schema.test.ts`
- `entities/master/api/load.ts`
- `entities/master/api/load.test.ts`
- `features/masters-admin/index.ts`
- `features/masters-admin/api/_common.ts`
- `features/masters-admin/api/create-master.ts`
- `features/masters-admin/api/update-master.ts`
- `features/masters-admin/api/archive-master.ts`
- `features/masters-admin/api/restore-master.ts`
- `features/masters-admin/api/reorder-masters.ts`
- `features/masters-admin/api/set-master-services.ts`
- `features/masters-admin/api/actions.test.ts`
- `features/masters-admin/ui/specialty-picker.tsx`
- `features/masters-admin/ui/specialty-picker.test.tsx`
- `features/masters-admin/ui/specialty-picker.stories.tsx`
- `features/masters-admin/ui/master-editor.tsx`
- `features/masters-admin/ui/master-editor.test.tsx`
- `features/masters-admin/ui/master-editor.stories.tsx`
- `features/masters-admin/ui/admin-masters-list.tsx`
- `features/masters-admin/ui/admin-masters-list.test.tsx`
- `app/[locale]/admin/masters/page.tsx`
- `app/[locale]/admin/masters/[id]/page.tsx`
- `app/[locale]/master/[slug]/page.tsx`
- `views/masters-list/index.ts`
- `views/masters-list/ui/masters-list-page.tsx`
- `e2e/admin-masters.spec.ts`

### Modified
- `db/schema.ts` — append `masterStatus` enum, `masters` table, `masterServices` join, types
- `db/services.ts` — `listPublishedServices()` now joins through `master_services` (orphan-hiding)
- `db/services.test.ts` — update existing assertions if any reference `listPublishedServices` directly
- `entities/studio/model/types.ts` — keep `Artist` for Phase 1 backwards-compat; remove in Phase 2 after every consumer is off it. (See Task 13 — we drop `STUDIO_DATA.artist` but the `Artist` type stays to avoid breaking `entities/studio/api/load-with-photos.ts` re-exports while the route is migrated.)
- `entities/studio/api/load-with-photos.ts` — drop `loadArtistWithPhoto` once unused
- `views/master/ui/master-page.tsx` — extend props so the route can pass any master (not just Violetta)
- `app/[locale]/master/page.tsx` — fork on published-master count, delegate to `MasterPage` (single) or `MastersListPage` (list)
- `views/home/ui/sections/master-strip.tsx` — read from DB loader instead of `STUDIO_DATA.artist`
- `features/photo-upload-admin/model/slot.ts` — derive master slots from `listAllMasters()`
- `app/[locale]/admin/page.tsx` — 5th inbox tile linking to `/admin/masters`
- `messages/{en,ru,be}.json` — `AdminMasters.*`, `Admin.dashboard.inbox_masters{,_caption}`

### Not touched in Phase 1
- `bookings` schema (Phase 2)
- `views/booking/*` (Phase 2)
- `features/google-calendar/*` (Phase 2)

---

## Reviewer advisories folded in

From the spec-reviewer round:

1. **Migration slot.** `0007` is the highest existing; `0008_admin_masters.sql` is correct.
2. **Orphan-hiding test fallout.** Task 6 explicitly updates any existing snapshot/test that depends on `listPublishedServices()` returning the full set. The seed (Task 2) keeps Violetta linked to every service, so existing e2e + view tests pass unchanged.
3. **Booking page is a server component.** Confirmed (`app/[locale]/booking/[step]/page.tsx` imports `setRequestLocale` from `next-intl/server`). No Phase 1 booking changes anyway.
4. **Submit-time race contract.** Out of scope for Phase 1 (no `bookings.master_id` yet).
5. **`/master/[slug]` in single-master mode.** Resolved: Task 14 makes `/master/[slug]` always render the hero for the named master, regardless of total count. The fork only governs what `/master` itself renders.
6. **Slice exports list.** Task 5 enumerates the `entities/master/index.ts` exports explicitly.

---

## Task 1: Schema — masters table + master_services join

**Files:**
- Modify: `db/schema.ts` (append after the `services` block, around line 320)
- Generate: `db/migrations/0008_admin_masters.sql`

- [ ] **Step 1: Append the new enum and tables to `db/schema.ts`**

Place these declarations **after** the `services` table (so the FK in `masterServices` resolves) and **before** the existing `photoSlotKind` enum so the typecheck remains stable.

```ts
/**
 * Lifecycle states for masters. Mirrors `serviceStatus`. `draft` and
 * `archived` are admin-only; only `published` rows are visible on
 * /master, on the booking step, and counted by auto-skip logic.
 * See docs/superpowers/specs/2026-05-22-admin-masters-management-design.md §2.1.
 */
export const masterStatus = pgEnum("master_status", [
  "draft",
  "published",
  "archived",
]);

export const masters = pgTable("masters", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameRu: text("name_ru").notNull(),
  nameBe: text("name_be").notNull(),
  roleEn: text("role_en").notNull(),
  roleRu: text("role_ru").notNull(),
  roleBe: text("role_be").notNull(),
  bioEn: text("bio_en").notNull(),
  bioRu: text("bio_ru").notNull(),
  bioBe: text("bio_be").notNull(),
  quoteEn: text("quote_en").notNull(),
  quoteRu: text("quote_ru").notNull(),
  quoteBe: text("quote_be").notNull(),
  years: integer("years").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  status: masterStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const masterServices = pgTable(
  "master_services",
  {
    masterId: text("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.masterId, t.serviceId] }),
    masterIdx: index("master_services_master_idx").on(t.masterId),
    serviceIdx: index("master_services_service_idx").on(t.serviceId),
  }),
);

export type Master = typeof masters.$inferSelect;
export type NewMaster = typeof masters.$inferInsert;
export type MasterServiceRow = typeof masterServices.$inferSelect;
```

Make sure `primaryKey` is imported from `drizzle-orm/pg-core` at the top of the file (it should already be — used by other join tables).

- [ ] **Step 2: Verify imports**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. If `primaryKey` is missing, add it to the existing `drizzle-orm/pg-core` import line.

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new file `db/migrations/0008_admin_masters.sql` containing `CREATE TYPE master_status`, `CREATE TABLE masters`, `CREATE TABLE master_services`, and the indexes.

- [ ] **Step 4: Commit (DDL only, seed comes next)**

```bash
git add db/schema.ts db/migrations/0008_admin_masters.sql db/migrations/meta/
git commit -m "feat(db): masters table + master_services join"
```

---

## Task 2: Seed Violetta + her current specialties

**Files:**
- Modify: `db/migrations/0008_admin_masters.sql` (append seed after the generated DDL)

- [ ] **Step 1: Append the seed block to the migration**

After the existing DDL, add:

```sql
-- ────────────────────────────────────────────────────────────────────
-- Seed: Violetta Marchenko + her current specialties (every published
-- service). Idempotent so re-running the migration in CI is a no-op.
-- Mirrors the seed pattern in 0007_admin_services.sql.
-- ────────────────────────────────────────────────────────────────────

INSERT INTO masters
  (id, name_en, name_ru, name_be, role_en, role_ru, role_be,
   bio_en, bio_ru, bio_be, quote_en, quote_ru, quote_be,
   years, sort_order, status)
VALUES (
  'violetta',
  'Violetta Marchenko', 'Виолетта Марченко', 'Віялета Марчанка',
  'Master nail artist & founder',
  'Мастер ногтевого сервиса и основательница',
  'Майстра ногцевага сэрвісу і заснавальніца',
  'Trained in Milan and Kyiv, Violetta runs a one-chair atelier — one guest at a time, by appointment only. Specialising in editorial nail design, glass shapes and Japanese gel.',
  'Обучалась в Милане и Киеве. Виолетта ведёт ателье на одно кресло — один гость за раз, только по предварительной записи. Специализация: редакторский дизайн ногтей, glass shape и японский гель.',
  'Навучалася ў Мілане і Кіеве. Віялета вядзе атэлье на адно крэсла — адзін госць за раз, толькі па запісе. Спецыялізацыя: рэдактарскі дызайн ногцяў, glass shape і японскі гель.',
  'A manicure is the smallest piece of jewellery a woman wears every day.',
  'Маникюр — это самое маленькое украшение, которое женщина носит каждый день.',
  'Манікюр — гэта самая маленькая упрыгожанне, якое жанчына носіць кожны дзень.',
  11, 0, 'published'
)
ON CONFLICT (id) DO NOTHING;

-- Link Violetta to every published service. Reseeding is safe — the
-- composite PK + ON CONFLICT makes the INSERT a no-op for existing
-- rows. New services added later default to *not* linked, so each new
-- service must be explicitly assigned via the admin specialty picker.
INSERT INTO master_services (master_id, service_id)
SELECT 'violetta', id FROM services WHERE status = 'published'
ON CONFLICT (master_id, service_id) DO NOTHING;
```

- [ ] **Step 2: Run the migration locally**

Run: `npm run db:migrate`
Expected: prints "0008_admin_masters" applied. If `DATABASE_URL` isn't set locally that's fine — CI runs the migration in its Postgres service container.

- [ ] **Step 3: Commit**

```bash
git add db/migrations/0008_admin_masters.sql
git commit -m "feat(db): seed Violetta + every published service as her specialty"
```

---

## Task 3: Read pipeline (`db/masters.ts`)

**Files:**
- Create: `db/masters.ts`
- Create: `db/masters.test.ts`

- [ ] **Step 1: Write `db/masters.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  db: null,
  schema: {
    masters: {},
    masterServices: {},
  },
}));

import {
  listAllMasters,
  listPublishedMasters,
  getMasterById,
  getMasterIdsForService,
  getServiceIdsForMaster,
  getServiceIdsHavingAnyPublishedMaster,
} from "./masters";

describe("db/masters — db-null tolerance", () => {
  it("listAllMasters returns []", async () => {
    expect(await listAllMasters()).toEqual([]);
  });
  it("listPublishedMasters returns []", async () => {
    expect(await listPublishedMasters()).toEqual([]);
  });
  it("getMasterById returns null", async () => {
    expect(await getMasterById("x")).toBeNull();
  });
  it("getMasterIdsForService returns []", async () => {
    expect(await getMasterIdsForService("any")).toEqual([]);
  });
  it("getServiceIdsForMaster returns []", async () => {
    expect(await getServiceIdsForMaster("any")).toEqual([]);
  });
  it("getServiceIdsHavingAnyPublishedMaster returns empty set", async () => {
    expect((await getServiceIdsHavingAnyPublishedMaster()).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it (must FAIL)**

Run: `npx vitest run db/masters.test.ts --pool=threads`
Expected: error "Cannot find module './masters'".

- [ ] **Step 3: Create `db/masters.ts`**

```ts
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB queries for masters + master_services. No locale logic, no
 * photo joining — those belong to entities/master/api/load.ts. Returns
 * empty arrays / null when DATABASE_URL is unset, and tolerates the
 * table not having been migrated yet (42P01). Mirrors db/services.ts.
 */

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

export async function listAllMasters(): Promise<schema.Master[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.masters)
      .orderBy(schema.masters.sortOrder, schema.masters.id);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listPublishedMasters(): Promise<schema.Master[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.masters)
      .where(eq(schema.masters.status, "published"))
      .orderBy(schema.masters.sortOrder, schema.masters.id);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getMasterById(
  id: string,
): Promise<schema.Master | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.masters)
      .where(eq(schema.masters.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function getMasterIdsForService(
  serviceId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select({ masterId: schema.masterServices.masterId })
      .from(schema.masterServices)
      .innerJoin(
        schema.masters,
        eq(schema.masterServices.masterId, schema.masters.id),
      )
      .where(
        and(
          eq(schema.masterServices.serviceId, serviceId),
          eq(schema.masters.status, "published"),
        ),
      );
    return rows.map((r) => r.masterId);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getServiceIdsForMaster(
  masterId: string,
): Promise<string[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select({ serviceId: schema.masterServices.serviceId })
      .from(schema.masterServices)
      .where(eq(schema.masterServices.masterId, masterId));
    return rows.map((r) => r.serviceId);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

/**
 * Set of service IDs that have at least one *published* master linked.
 * Used by listPublishedServices() to hide orphan services from the
 * public menu. Empty set when DB is unreachable, table missing, or no
 * published masters exist.
 */
export async function getServiceIdsHavingAnyPublishedMaster(): Promise<
  Set<string>
> {
  if (!db) return new Set();
  try {
    const rows = await db
      .selectDistinct({ serviceId: schema.masterServices.serviceId })
      .from(schema.masterServices)
      .innerJoin(
        schema.masters,
        eq(schema.masterServices.masterId, schema.masters.id),
      )
      .where(eq(schema.masters.status, "published"));
    return new Set(rows.map((r) => r.serviceId));
  } catch (error) {
    if (isMissingTable(error)) return new Set();
    throw error;
  }
}
```

- [ ] **Step 4: Tests pass**

Run: `npx vitest run db/masters.test.ts --pool=threads`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add db/masters.ts db/masters.test.ts
git commit -m "feat(db): masters read pipeline"
```

---

## Task 4: Write pipeline (`db/masters-mutations.ts`)

**Files:**
- Create: `db/masters-mutations.ts`
- Create: `db/masters-mutations.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  db: null,
  schema: {
    masters: {},
    masterServices: {},
    bookings: {},
  },
}));

import {
  createMaster,
  updateMaster,
  archiveMaster,
  restoreMaster,
  reorderMasters,
  setMasterServices,
  countUpcomingBookingsForMaster,
} from "./masters-mutations";

describe("db/masters-mutations — db-null tolerance", () => {
  it("createMaster returns db_unavailable", async () => {
    expect(
      await createMaster({
        id: "x",
        nameEn: "X",
        nameRu: "X",
        nameBe: "X",
        roleEn: "r",
        roleRu: "r",
        roleBe: "r",
        bioEn: "b",
        bioRu: "b",
        bioBe: "b",
        quoteEn: "q",
        quoteRu: "q",
        quoteBe: "q",
        years: 0,
        sortOrder: 0,
        status: "draft",
      }),
    ).toEqual({ ok: false, error: "db_unavailable" });
  });
  it("archiveMaster returns db_unavailable", async () => {
    expect(await archiveMaster("x")).toEqual({
      ok: false,
      error: "db_unavailable",
    });
  });
  it("countUpcomingBookingsForMaster returns 0 with no db", async () => {
    expect(await countUpcomingBookingsForMaster("x")).toBe(0);
  });
});
```

- [ ] **Step 2: Run (FAIL)**

Run: `npx vitest run db/masters-mutations.test.ts --pool=threads`
Expected: "Cannot find module './masters-mutations'".

- [ ] **Step 3: Implement `db/masters-mutations.ts`**

Use this exact template (mirrors `db/services-mutations.ts`):

```ts
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "./index";

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

export type MutationResult =
  | { ok: true }
  | { ok: false; error: "db_unavailable" }
  | { ok: false; error: "master_has_upcoming_bookings"; blockingCount: number };

const DB_UNAVAILABLE = { ok: false, error: "db_unavailable" } as const;

function withGuard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((error) => {
    if (isMissingTable(error)) return fallback;
    throw error;
  });
}

export async function createMaster(
  input: schema.NewMaster,
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.masters).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "draft",
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateMaster(
  id: string,
  patch: Omit<schema.NewMaster, "id" | "createdAt">,
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.masters)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(schema.masters.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function archiveMaster(id: string): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    // Phase 1: bookings.master_id doesn't exist yet, so we can't count
    // upcoming bookings tied to this master. The archive guard is a
    // no-op in Phase 1; Phase 2 wires it up properly. For now, archive
    // proceeds unconditionally.
    const count = await countUpcomingBookingsForMaster(id);
    if (count > 0) {
      return {
        ok: false,
        error: "master_has_upcoming_bookings",
        blockingCount: count,
      };
    }
    await db!
      .update(schema.masters)
      .set({ status: "archived", updatedAt: sql`now()` })
      .where(eq(schema.masters.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function restoreMaster(id: string): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.masters)
      .set({ status: "draft", updatedAt: sql`now()` })
      .where(eq(schema.masters.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function reorderMasters(
  ids: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await tx
          .update(schema.masters)
          .set({ sortOrder: i, updatedAt: sql`now()` })
          .where(eq(schema.masters.id, ids[i]));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Replaces the master's full set of service specialties with the
 * given list. Diff-based: rows present in `serviceIds` and missing
 * from the DB are inserted; rows in the DB but absent from
 * `serviceIds` are deleted. Single transaction.
 */
export async function setMasterServices(
  masterId: string,
  serviceIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      // Delete rows that should no longer exist.
      if (serviceIds.length === 0) {
        await tx
          .delete(schema.masterServices)
          .where(eq(schema.masterServices.masterId, masterId));
      } else {
        await tx
          .delete(schema.masterServices)
          .where(
            and(
              eq(schema.masterServices.masterId, masterId),
              sql`${schema.masterServices.serviceId} NOT IN ${serviceIds}`,
            ),
          );
      }
      // Insert any rows missing from the DB.
      for (const sid of serviceIds) {
        await tx
          .insert(schema.masterServices)
          .values({ masterId, serviceId: sid })
          .onConflictDoNothing();
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Phase 1 stub: bookings.master_id doesn't exist yet, so this always
 * returns 0. Phase 2 swaps in a real COUNT(*) query.
 */
export async function countUpcomingBookingsForMaster(
  _masterId: string,
): Promise<number> {
  return 0;
}
```

- [ ] **Step 4: Tests pass**

Run: `npx vitest run db/masters-mutations.test.ts --pool=threads`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add db/masters-mutations.ts db/masters-mutations.test.ts
git commit -m "feat(db): masters mutations + (stub) archive guard"
```

---

## Task 5: `entities/master/` — types + schema + loader

**Files:**
- Create: `entities/master/index.ts`
- Create: `entities/master/model/types.ts`
- Create: `entities/master/model/schema.ts`
- Create: `entities/master/model/schema.test.ts`
- Create: `entities/master/api/load.ts`
- Create: `entities/master/api/load.test.ts`

- [ ] **Step 1: `entities/master/model/types.ts`**

```ts
import type { ImageAsset } from "@/entities/studio";

export type MasterStatus = "draft" | "published" | "archived";

/**
 * Runtime master record after locale resolution. The DB row carries
 * en/ru/be triples; this is the single-locale projection consumed by
 * UI. `serviceIds` is the master's specialty list; consumers use it
 * for the "X services" badge in admin and for eligibility checks at
 * the booking step (Phase 2).
 */
export interface Master {
  id: string;
  name: string;
  role: string;
  bio: string;
  quote: string;
  years: number;
  sortOrder: number;
  status: MasterStatus;
  image?: ImageAsset;
  serviceIds: string[];
}
```

- [ ] **Step 2: `entities/master/model/schema.ts`**

```ts
import { z } from "zod";
import { slugSchema, requiredLocaleString } from "@/entities/service/model/schema";

export const masterStatusSchema = z.enum(["draft", "published", "archived"]);

export const masterFormSchema = z.object({
  id: slugSchema,
  nameEn: requiredLocaleString(80),
  nameRu: requiredLocaleString(80),
  nameBe: requiredLocaleString(80),
  roleEn: requiredLocaleString(120),
  roleRu: requiredLocaleString(120),
  roleBe: requiredLocaleString(120),
  bioEn: requiredLocaleString(1000),
  bioRu: requiredLocaleString(1000),
  bioBe: requiredLocaleString(1000),
  quoteEn: requiredLocaleString(280),
  quoteRu: requiredLocaleString(280),
  quoteBe: requiredLocaleString(280),
  years: z.number().int().min(0).max(80),
  sortOrder: z.number().int().min(0),
  status: masterStatusSchema,
  serviceIds: z.array(slugSchema).max(200),
});

export type MasterFormInput = z.infer<typeof masterFormSchema>;
```

> **Note** — `slugSchema` and `requiredLocaleString` are already exported from `entities/service/model/schema.ts` per PR #45. Confirm with `grep "export.*slugSchema\|export.*requiredLocaleString" entities/service/model/schema.ts` before running the test.

- [ ] **Step 3: `entities/master/model/schema.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { masterFormSchema } from "./schema";

const valid = {
  id: "violetta",
  nameEn: "Violetta",
  nameRu: "Виолетта",
  nameBe: "Віялета",
  roleEn: "Master",
  roleRu: "Мастер",
  roleBe: "Майстра",
  bioEn: "EN bio",
  bioRu: "RU bio",
  bioBe: "BE bio",
  quoteEn: "EN quote",
  quoteRu: "RU quote",
  quoteBe: "BE quote",
  years: 11,
  sortOrder: 0,
  status: "published" as const,
  serviceIds: ["signature", "gel"],
};

describe("masterFormSchema", () => {
  it("accepts a well-formed master", () => {
    expect(masterFormSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects blank nameRu with 'required'", () => {
    const res = masterFormSchema.safeParse({ ...valid, nameRu: "" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe("required");
    }
  });
  it("rejects an invalid slug", () => {
    const res = masterFormSchema.safeParse({ ...valid, id: "Violetta!" });
    expect(res.success).toBe(false);
  });
  it("rejects years > 80", () => {
    expect(masterFormSchema.safeParse({ ...valid, years: 81 }).success).toBe(
      false,
    );
  });
});
```

- [ ] **Step 4: `entities/master/api/load.ts`**

```ts
// server-only — accesses the database. Never import from a client
// component.
import { listAllMasters, listPublishedMasters, getMasterById, getServiceIdsForMaster, getMasterIdsForService } from "@/db/masters";
import { getStudioPhoto } from "@/db/studio-photos";
import type { Master, MasterStatus } from "../model/types";
import type { Master as MasterRow } from "@/db/schema";

type Locale = "en" | "ru" | "be";

function pickLocale<T extends { nameEn: string; nameRu: string; nameBe: string }>(
  row: T,
  locale: Locale,
  field: "name" | "role" | "bio" | "quote",
): string {
  const k =
    locale === "ru"
      ? (`${field}Ru` as const)
      : locale === "be"
        ? (`${field}Be` as const)
        : (`${field}En` as const);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (row as any)[k] ?? "";
}

async function rowToMaster(row: MasterRow, locale: Locale): Promise<Master> {
  const [photo, serviceIds] = await Promise.all([
    getStudioPhoto("master", row.id),
    getServiceIdsForMaster(row.id),
  ]);
  return {
    id: row.id,
    name: pickLocale(row, locale, "name"),
    role: pickLocale(row, locale, "role"),
    bio: pickLocale(row, locale, "bio"),
    quote: pickLocale(row, locale, "quote"),
    years: row.years,
    sortOrder: row.sortOrder,
    status: row.status as MasterStatus,
    image: photo?.image ?? undefined,
    serviceIds,
  };
}

export async function loadMastersForLocale(
  locale: Locale,
  opts?: { publishedOnly?: boolean },
): Promise<Master[]> {
  const rows = opts?.publishedOnly
    ? await listPublishedMasters()
    : await listAllMasters();
  return Promise.all(rows.map((r) => rowToMaster(r, locale)));
}

export async function loadMasterBySlugForLocale(
  slug: string,
  locale: Locale,
): Promise<Master | null> {
  const row = await getMasterById(slug);
  if (!row) return null;
  return rowToMaster(row, locale);
}

export async function loadPublishedMasterCount(): Promise<number> {
  const rows = await listPublishedMasters();
  return rows.length;
}

export async function loadEligibleMastersForService(
  serviceId: string,
  locale: Locale,
): Promise<Master[]> {
  const ids = await getMasterIdsForService(serviceId);
  if (ids.length === 0) return [];
  const all = await loadMastersForLocale(locale, { publishedOnly: true });
  return all.filter((m) => ids.includes(m.id));
}
```

> **Note** on the `// server-only` comment marker — matches the same convention in `entities/service/api/load.ts` (the `import "server-only"` package was tried in services Phase 1 but threw inside Vitest's jsdom env; we settled on a comment-only marker).

- [ ] **Step 5: `entities/master/api/load.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/masters", () => ({
  listAllMasters: vi.fn().mockResolvedValue([]),
  listPublishedMasters: vi.fn().mockResolvedValue([]),
  getMasterById: vi.fn().mockResolvedValue(null),
  getServiceIdsForMaster: vi.fn().mockResolvedValue([]),
  getMasterIdsForService: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/db/studio-photos", () => ({
  getStudioPhoto: vi.fn().mockResolvedValue(null),
}));

import {
  loadMastersForLocale,
  loadMasterBySlugForLocale,
  loadPublishedMasterCount,
  loadEligibleMastersForService,
} from "./load";

describe("entities/master/api/load — empty DB", () => {
  it("loadMastersForLocale returns []", async () => {
    expect(await loadMastersForLocale("en")).toEqual([]);
  });
  it("loadMasterBySlugForLocale returns null", async () => {
    expect(await loadMasterBySlugForLocale("anyone", "en")).toBeNull();
  });
  it("loadPublishedMasterCount returns 0", async () => {
    expect(await loadPublishedMasterCount()).toBe(0);
  });
  it("loadEligibleMastersForService returns []", async () => {
    expect(await loadEligibleMastersForService("any", "en")).toEqual([]);
  });
});
```

- [ ] **Step 6: `entities/master/index.ts`**

```ts
export type { Master, MasterStatus } from "./model/types";
export {
  masterFormSchema,
  masterStatusSchema,
  type MasterFormInput,
} from "./model/schema";
export {
  loadMastersForLocale,
  loadMasterBySlugForLocale,
  loadPublishedMasterCount,
  loadEligibleMastersForService,
} from "./api/load";
```

- [ ] **Step 7: Run tests + lint**

Run: `npx vitest run entities/master/ --pool=threads && npx eslint entities/master/`
Expected: all tests pass; no lint errors.

- [ ] **Step 8: Commit**

```bash
git add entities/master/
git commit -m "feat(master): runtime types + zod schema + locale loader"
```

---

## Task 6: Orphan-service hiding in `listPublishedServices()`

**Files:**
- Modify: `db/services.ts:38-50` (rewrite `listPublishedServices` to filter by master coverage)
- Modify: existing test files that depend on the old return shape — run `grep -rn "listPublishedServices" --include="*.ts" --include="*.tsx"` to enumerate. Expected: a handful in `views/services-catalog/*`, `views/booking/*`, sitemap.

- [ ] **Step 1: Update `db/services.ts.listPublishedServices`**

Replace the existing implementation with:

```ts
export async function listPublishedServices(): Promise<schema.Service[]> {
  if (!db) return [];
  try {
    const eligibleIds = await getServiceIdsHavingAnyPublishedMaster();
    // If the masters table isn't populated yet (zero published masters)
    // the orphan-hide rule would empty the menu. Fall through to the
    // unfiltered behaviour in that case so first-run installs aren't
    // dead. Admin sees a banner via the orphan check in /admin/services.
    if (eligibleIds.size === 0) {
      return await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.status, "published"))
        .orderBy(schema.services.sortOrder);
    }
    return await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.status, "published"))
      .orderBy(schema.services.sortOrder)
      .then((rows) => rows.filter((r) => eligibleIds.has(r.id)));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
```

Add at the top of the file: `import { getServiceIdsHavingAnyPublishedMaster } from "./masters";`

- [ ] **Step 2: Verify no consumers break**

Run: `npx vitest run --pool=threads`
Expected: all 411 tests still pass. If any service-catalog or booking-service-step test now sees a different list, update its fixture to seed at least one published master with the relevant services (or — if the test mocks `listPublishedServices` — no change needed).

- [ ] **Step 3: Commit**

```bash
git add db/services.ts
git commit -m "feat(services): hide services with no published master"
```

---

## Task 7: i18n message keys

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`

- [ ] **Step 1: Add to each locale**

Append to the `Admin.dashboard` namespace (existing inbox tile list):

```jsonc
"inbox_masters": "Masters",
"inbox_masters_caption": "Add, edit, archive the team behind the chair"
```

(For RU: `"Мастера"` / `"Добавляйте, редактируйте и архивируйте команду атэлье"`. For BE: `"Майстры"` / `"Дадавайце, рэдагуйце і архівуйце каманду атэлье"`.)

Add a new top-level namespace `AdminMasters` to each file with these keys (EN values shown; supply RU/BE translations alongside):

```jsonc
"AdminMasters": {
  "meta_title": "Masters",
  "plate_title": "Masters",
  "title_new_master": "New master",
  "title_edit_master": "Edit master",
  "section_published": "Published",
  "section_drafts": "Drafts",
  "section_archived": "Archived",
  "cta_new": "New master",
  "cta_save": "Save",
  "cta_archive": "Archive",
  "cta_restore": "Restore",
  "label_slug": "Slug",
  "label_slug_hint": "Lowercase letters, numbers, hyphens. Frozen after first save.",
  "label_status": "Status",
  "label_years": "Years experience",
  "label_name_en": "Name (English)",
  "label_name_ru": "Name (Russian)",
  "label_name_be": "Name (Belarusian)",
  "label_role_en": "Role (English)",
  "label_role_ru": "Role (Russian)",
  "label_role_be": "Role (Belarusian)",
  "label_bio_en": "Bio (English)",
  "label_bio_ru": "Bio (Russian)",
  "label_bio_be": "Bio (Belarusian)",
  "label_quote_en": "Quote (English)",
  "label_quote_ru": "Quote (Russian)",
  "label_quote_be": "Quote (Belarusian)",
  "label_photo": "Portrait",
  "label_photo_hint": "1:1.2 portrait — master page hero",
  "label_specialties": "Specialties",
  "label_specialties_hint": "Tick every service this master performs.",
  "specialties_count": "{count, plural, one {# service} other {# services}}",
  "specialties_empty_warning": "No specialties yet — this master can't take bookings.",
  "specialties_select_all": "Select all",
  "specialties_clear": "Clear",
  "status_draft": "Draft",
  "status_published": "Published",
  "status_archived": "Archived",
  "saved": "Saved",
  "save_failed": "Save failed: {error}",
  "archive_blocked": "{count, plural, one {# upcoming booking} other {# upcoming bookings}} — reassign or cancel first.",
  "validation_required": "Required",
  "validation_slug_invalid": "Lowercase letters, numbers, hyphens only.",
  "empty_published": "No published masters yet.",
  "empty_archived": "Nothing in the archive."
}
```

- [ ] **Step 2: Sanity-check the JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))" && node -e "JSON.parse(require('fs').readFileSync('messages/ru.json'))" && node -e "JSON.parse(require('fs').readFileSync('messages/be.json'))"`
Expected: no output (parses cleanly).

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat(i18n): AdminMasters namespace + inbox tile keys"
```

---

## Task 8: Server actions (`features/masters-admin/api/*`)

**Files:**
- Create: `features/masters-admin/api/_common.ts`
- Create: `features/masters-admin/api/create-master.ts`
- Create: `features/masters-admin/api/update-master.ts`
- Create: `features/masters-admin/api/archive-master.ts`
- Create: `features/masters-admin/api/restore-master.ts`
- Create: `features/masters-admin/api/reorder-masters.ts`
- Create: `features/masters-admin/api/set-master-services.ts`
- Create: `features/masters-admin/api/actions.test.ts`
- Create: `features/masters-admin/index.ts`

- [ ] **Step 1: Read the services-admin reference**

Look at `features/services-admin/api/_common.ts` and `features/services-admin/api/create-service.ts`. The masters versions mirror them line-for-line, just with the masters schema/mutations. Stick to that shape.

- [ ] **Step 2: Write `_common.ts`**

```ts
// Mirrors features/services-admin/api/_common.ts. Only gates when
// TELEGRAM_BOT_TOKEN is set, matching the same auth posture used by
// the site-settings + services-admin features.
import { requireAdmin } from "@/shared/lib/auth-server";

export async function gateAdmin(): Promise<
  { ok: true } | { ok: false; error: "unauthorized" }
> {
  const required = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (!required) return { ok: true };
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "unauthorized" };
  return { ok: true };
}
```

- [ ] **Step 3: Write `create-master.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { masterFormSchema } from "@/entities/master";
import { createMaster } from "@/db/masters-mutations";
import { setMasterServices } from "@/db/masters-mutations";
import { gateAdmin } from "./_common";

export async function createMasterAction(input: unknown) {
  const auth = await gateAdmin();
  if (!auth.ok) return auth;
  const parsed = masterFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_payload" };
  }
  const { serviceIds, ...row } = parsed.data;
  const created = await createMaster(row);
  if (!created.ok) return created;
  const linked = await setMasterServices(parsed.data.id, serviceIds);
  if (!linked.ok) return linked;
  revalidatePath("/[locale]/admin/masters", "layout");
  revalidatePath("/[locale]/master", "layout");
  return { ok: true as const };
}
```

- [ ] **Step 4: `update-master.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { masterFormSchema } from "@/entities/master";
import { updateMaster, setMasterServices } from "@/db/masters-mutations";
import { gateAdmin } from "./_common";

const patchSchema = masterFormSchema.omit({ id: true });

export async function updateMasterAction(id: string, patch: unknown) {
  const auth = await gateAdmin();
  if (!auth.ok) return auth;
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_payload" };
  }
  const { serviceIds, ...row } = parsed.data;
  const updated = await updateMaster(id, row);
  if (!updated.ok) return updated;
  const linked = await setMasterServices(id, serviceIds);
  if (!linked.ok) return linked;
  revalidatePath("/[locale]/admin/masters", "layout");
  revalidatePath("/[locale]/master", "layout");
  revalidatePath(`/[locale]/master/${id}`, "layout");
  return { ok: true as const };
}
```

- [ ] **Step 5: `archive-master.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { archiveMaster } from "@/db/masters-mutations";
import { gateAdmin } from "./_common";

export async function archiveMasterAction(id: string) {
  const auth = await gateAdmin();
  if (!auth.ok) return auth;
  const result = await archiveMaster(id);
  revalidatePath("/[locale]/admin/masters", "layout");
  revalidatePath("/[locale]/master", "layout");
  return result;
}
```

- [ ] **Step 6: `restore-master.ts`, `reorder-masters.ts`, `set-master-services.ts`**

Same pattern. `restoreMasterAction(id)`, `reorderMastersAction(ids: string[])`, `setMasterServicesAction(id: string, serviceIds: string[])`. Each:
1. `"use server"`
2. `gateAdmin()`
3. Validate inputs (slug array for reorder, ditto for set-master-services)
4. Delegate to the matching db/masters-mutations export
5. Revalidate `/admin/masters` and `/master` layouts

- [ ] **Step 7: `features/masters-admin/index.ts`**

```ts
export { MasterEditor } from "./ui/master-editor";
export type { MasterEditorInitial } from "./ui/master-editor";
export { AdminMastersList } from "./ui/admin-masters-list";
export { SpecialtyPicker } from "./ui/specialty-picker";
export { createMasterAction } from "./api/create-master";
export { updateMasterAction } from "./api/update-master";
export { archiveMasterAction } from "./api/archive-master";
export { restoreMasterAction } from "./api/restore-master";
export { reorderMastersAction } from "./api/reorder-masters";
export { setMasterServicesAction } from "./api/set-master-services";
```

- [ ] **Step 8: `actions.test.ts`**

Mirror `features/services-admin/api/actions.test.ts`. Smoke-test that:
1. `createMasterAction` rejects an invalid payload with `error: "invalid_payload"`.
2. `createMasterAction` rejects an unauthorized caller when `TELEGRAM_BOT_TOKEN` is set (mock `requireAdmin` to return `{ ok: false }`).
3. `archiveMasterAction` returns `db_unavailable` when DB is null.

Use the same `vi.mock("@/db/masters-mutations", ...)` and `vi.mock("@/shared/lib/auth-server", ...)` patterns from the services version.

- [ ] **Step 9: Tests + lint**

Run: `npx vitest run features/masters-admin/ --pool=threads && npx eslint features/masters-admin/`
Expected: all tests pass; no lint errors.

- [ ] **Step 10: Commit**

```bash
git add features/masters-admin/
git commit -m "feat(masters-admin): server actions for CRUD + reorder + specialty link"
```

---

## Task 9: `SpecialtyPicker` component

**Files:**
- Create: `features/masters-admin/ui/specialty-picker.tsx`
- Create: `features/masters-admin/ui/specialty-picker.test.tsx`
- Create: `features/masters-admin/ui/specialty-picker.stories.tsx`

- [ ] **Step 1: Write a focused test (test-first)**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SpecialtyPicker } from "./specialty-picker";

const services = [
  { id: "signature", name: "Signature", categoryId: "care", categoryName: "Care" },
  { id: "gel", name: "Gel", categoryId: "gel", categoryName: "Gel" },
];

function setup(initial: string[] = []) {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SpecialtyPicker services={services} value={initial} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

describe("SpecialtyPicker", () => {
  it("ticks the initially-selected services", () => {
    setup(["gel"]);
    expect(screen.getByLabelText("Signature")).not.toBeChecked();
    expect(screen.getByLabelText("Gel")).toBeChecked();
  });
  it("toggles a service and emits onChange", async () => {
    const { onChange } = setup([]);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Gel"));
    expect(onChange).toHaveBeenCalledWith(["gel"]);
  });
  it("Select all selects every service in the category", async () => {
    const { onChange } = setup([]);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: /Select all/ })[0]);
    expect(onChange).toHaveBeenCalled();
    const args = onChange.mock.calls[0][0] as string[];
    expect(args).toContain("signature");
  });
});
```

- [ ] **Step 2: Implement `SpecialtyPicker`**

```tsx
"use client";

import { useTranslations } from "next-intl";

interface ServiceOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface Props {
  services: readonly ServiceOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
}

export function SpecialtyPicker({ services, value, onChange }: Props) {
  const t = useTranslations("AdminMasters");
  const selected = new Set(value);

  // Group services by categoryId, preserving the input order.
  const groups = new Map<
    string,
    { name: string; services: ServiceOption[] }
  >();
  for (const s of services) {
    if (!groups.has(s.categoryId)) {
      groups.set(s.categoryId, { name: s.categoryName, services: [] });
    }
    groups.get(s.categoryId)!.services.push(s);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }
  function selectAll(ids: string[]) {
    const next = new Set(selected);
    for (const id of ids) next.add(id);
    onChange([...next]);
  }
  function clearGroup(ids: string[]) {
    const next = new Set(selected);
    for (const id of ids) next.delete(id);
    onChange([...next]);
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {t("label_specialties")}
      </legend>
      <p className="text-[11px] text-text-3">{t("label_specialties_hint")}</p>
      {selected.size === 0 ? (
        <p className="text-[12px] text-accent" role="alert">
          {t("specialties_empty_warning")}
        </p>
      ) : null}
      {[...groups.entries()].map(([catId, group]) => {
        const ids = group.services.map((s) => s.id);
        return (
          <div key={catId} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-2">
                {group.categoryName ?? group.name}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.16em] text-accent hover:underline"
                  onClick={() => selectAll(ids)}
                >
                  {t("specialties_select_all")}
                </button>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.16em] text-text-3 hover:underline"
                  onClick={() => clearGroup(ids)}
                >
                  {t("specialties_clear")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.services.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-[13px] text-text-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
```

- [ ] **Step 3: Story file**

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SpecialtyPicker } from "./specialty-picker";

const meta: Meta<typeof SpecialtyPicker> = {
  title: "Features/MastersAdmin/SpecialtyPicker",
  component: SpecialtyPicker,
};
export default meta;

const services = [
  { id: "signature", name: "Signature", categoryId: "care", categoryName: "Care" },
  { id: "pedi", name: "Pedicure", categoryId: "care", categoryName: "Care" },
  { id: "gel", name: "Gel", categoryId: "gel", categoryName: "Gel" },
];

export const Default: StoryObj<typeof SpecialtyPicker> = {
  args: { services, value: ["gel"], onChange: () => undefined },
};
```

- [ ] **Step 4: Run tests + lint**

Run: `npx vitest run features/masters-admin/ui/specialty-picker --pool=threads && npx eslint features/masters-admin/ui/`
Expected: 3 tests pass; no lint errors.

- [ ] **Step 5: Commit**

```bash
git add features/masters-admin/ui/specialty-picker*
git commit -m "feat(masters-admin): SpecialtyPicker — service tick grid"
```

---

## Task 10: `MasterEditor` component

**Files:**
- Create: `features/masters-admin/ui/master-editor.tsx`
- Create: `features/masters-admin/ui/master-editor.test.tsx`
- Create: `features/masters-admin/ui/master-editor.stories.tsx`

- [ ] **Step 1: Mirror `features/services-admin/ui/service-editor.tsx`**

Use the same shape (heading + photo slot hoisted ABOVE the form, then `<form>` with Field components, Save button at the bottom). Key differences:

- Fields: slug (frozen on edit), status, years (integer), name×3, role×3, bio×3 (textarea), quote×3 (textarea), specialties picker (a `SpecialtyPicker` sibling, **outside** the form is unnecessary — checkboxes are inert HTML and don't conflict with a parent form).
- No `IncludesFieldset`, no price, no duration, no category.
- `serviceIds` lives in local state alongside the text fields; the validation step runs both `masterFormSchema` and uses `serviceIds` from local state.
- `onSubmit` returns the same `{ ok, error }` shape; on `ok` set `uiStatus = { kind: "saved" }`.

> **CRITICAL** — apply the [nested-form fix from PR #46](../../../features/services-admin/ui/service-editor.tsx) up front: photo slot renders inside the outer `<div>` but **above** the `<form>`. Don't repeat the bug.

Skeleton (write the editor by adapting service-editor.tsx 1:1):

```tsx
"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { masterFormSchema } from "@/entities/master";
import type { MasterFormInput } from "@/entities/master";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import { SpecialtyPicker } from "./specialty-picker";

// ... interfaces MasterEditorInitial / MasterEditorProps mirror the
// services-editor types one-for-one. Photo slot lives in a `photoSlot`
// optional prop.

export interface MasterEditorInitial {
  id: string;
  nameEn: string; nameRu: string; nameBe: string;
  roleEn: string; roleRu: string; roleBe: string;
  bioEn: string; bioRu: string; bioBe: string;
  quoteEn: string; quoteRu: string; quoteBe: string;
  years: number;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  serviceIds: string[];
}

export interface ServiceOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

export interface MasterEditorProps {
  mode: "create" | "edit";
  initial: MasterEditorInitial;
  services: readonly ServiceOption[];
  onSubmit: (patch: MasterFormInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  photoSlot?: React.ReactNode;
}

// ... rest: copy service-editor.tsx structure; render photoSlot above
// the <form>; specialty picker inside the form is fine (it's not a
// nested form). Save button at the bottom of the form.
```

- [ ] **Step 2: Tests**

```tsx
// master-editor.test.tsx
// Cover:
//   - Slug input is disabled when mode === "edit"
//   - Empty RU bio surfaces "Required" inline
//   - photoSlot renders OUTSIDE the editor's <form> (regression test
//     mirroring the one in service-editor.test.tsx)
//   - Ticking a service via SpecialtyPicker, then Save submits with
//     serviceIds present
```

- [ ] **Step 3: Run tests + lint**

Run: `npx vitest run features/masters-admin/ui/master-editor --pool=threads`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add features/masters-admin/ui/master-editor*
git commit -m "feat(masters-admin): MasterEditor — i18n inputs + specialty picker + photo slot"
```

---

## Task 11: `AdminMastersList` component

**Files:**
- Create: `features/masters-admin/ui/admin-masters-list.tsx`
- Create: `features/masters-admin/ui/admin-masters-list.test.tsx`

- [ ] **Step 1: Mirror `features/services-admin/ui/admin-services-list.tsx`**

Structure:
- Section heading "Published"
- `SortableList` with rows: portrait thumb (when image present) + name + role + status pill + "X services" badge + edit link + drag handle
- Section heading "Drafts" (same shape)
- Section heading "Archived" (no drag, "Restore" button per row)
- `reorderMastersAction` called on dnd-kit drop, parent re-renders via `key={ids.join("|")}` remount

- [ ] **Step 2: Test**

```tsx
// admin-masters-list.test.tsx
// Cover:
//   - Renders Published + Archived headings
//   - Each row links to /admin/masters/{id}
//   - The "X services" badge reflects serviceIds.length
```

- [ ] **Step 3: Lint + tests**

Run: `npx vitest run features/masters-admin/ui/admin-masters-list --pool=threads`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add features/masters-admin/ui/admin-masters-list*
git commit -m "feat(masters-admin): AdminMastersList — drag handles, status sections, specialty badge"
```

---

## Task 12: Admin routes (`/admin/masters` + `/admin/masters/[id]`) + inbox tile

**Files:**
- Create: `app/[locale]/admin/masters/page.tsx`
- Create: `app/[locale]/admin/masters/[id]/page.tsx`
- Modify: `app/[locale]/admin/page.tsx` (add 5th inbox tile)

- [ ] **Step 1: List route — `app/[locale]/admin/masters/page.tsx`**

Mirror `app/[locale]/admin/services/page.tsx` line-for-line:
1. `force-dynamic`
2. `requireAdmin` gate behind `TELEGRAM_BOT_TOKEN` check
3. `setRequestLocale`, `getTranslations("AdminMasters")`
4. Load: `loadMastersForLocale(locale)`, `listAllServices()` (for specialty counts on each row)
5. Render `<AdminMastersList masters={...} services={...} />`

- [ ] **Step 2: Editor route — `app/[locale]/admin/masters/[id]/page.tsx`**

Mirror `app/[locale]/admin/services/[id]/page.tsx`:
1. `id === "new"` → mode `"create"`; otherwise load `loadMasterBySlugForLocale(id, locale)` and `getStudioPhoto("master", id)`
2. Build the `services` list (id, name, categoryId, categoryName) by joining `listPublishedServices()` with categories
3. `onSubmit`: `"use server"` calls `createMasterAction` (create) or `updateMasterAction(id, rest)` (edit), stripping `id` from the patch via an explicit `Omit<MasterFormInput, "id">` pick (the same pattern shipped in [commit 6847821](../../app/[locale]/admin/services/[id]/page.tsx))
4. `photoSlot = mode === "edit" ? <PhotoUploadRow slot={{ kind: "master", id, label: t("label_photo"), hint: t("label_photo_hint") }} current={photo?.image ?? null} storageConfigured={...} /> : undefined`
5. Wrap in `<div className="pb-16">` + `<AppHeader back="/admin/masters" title={t("plate_title")} admin />` + `<MasterEditor mode initial services onSubmit photoSlot />`

- [ ] **Step 3: Inbox tile — `app/[locale]/admin/page.tsx`**

Add a 5th tile after the existing ones:

```tsx
<InboxTile
  href="/admin/masters"
  label={t("inbox_masters")}
  caption={t("inbox_masters_caption")}
/>
```

- [ ] **Step 4: Smoke-test the routes**

Run: `npm run build`
Expected: build succeeds; `/[locale]/admin/masters` and `/[locale]/admin/masters/[id]` appear in the route table.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/admin/masters/ app/[locale]/admin/page.tsx
git commit -m "feat(admin): /admin/masters list + editor routes, 5th inbox tile"
```

---

## Task 13: Photo slot wiring — replace hardcoded "violetta" with masters loop

**Files:**
- Modify: `features/photo-upload-admin/model/slot.ts:23-71`

- [ ] **Step 1: Replace the hardcoded master slot with a derived loop**

In `listAllPhotoSlots()`, replace the lines that push `{ kind: "master", id: "violetta", ... }` with:

```ts
import { listAllMasters } from "@/db/masters";
// ... inside listAllPhotoSlots():
const masters = await listAllMasters();
for (const m of masters) {
  slots.push({
    kind: "master",
    id: m.id,
    label: m.nameEn,
    hint: "1:1.2 portrait — master page hero",
  });
}
```

- [ ] **Step 2: Build + smoke**

Run: `npm run build && npx vitest run --pool=threads`
Expected: green. The seeded Violetta row produces an identical slot entry, so the admin photos page is byte-identical for existing users.

- [ ] **Step 3: Commit**

```bash
git add features/photo-upload-admin/model/slot.ts
git commit -m "feat(photo-slots): derive master slots from masters table"
```

---

## Task 14: Lift `/master` page + add `/master/[slug]` dynamic route + lift home strip

**Files:**
- Modify: `app/[locale]/master/page.tsx`
- Create: `app/[locale]/master/[slug]/page.tsx`
- Modify: `views/master/ui/master-page.tsx` (extend props to accept any master)
- Create: `views/masters-list/index.ts`
- Create: `views/masters-list/ui/masters-list-page.tsx`
- Modify: `views/home/ui/sections/master-strip.tsx` (consume new entity loader)
- Modify: `app/[locale]/home/page.tsx` (pass loaded master into the strip)

- [ ] **Step 1: Extend `MasterPage` props**

`views/master/ui/master-page.tsx` currently uses `artist?: Artist` (from `entities/studio`). Add an alternative `master?: Master` prop and treat the two interchangeably internally — name + role + bio + quote + years + image map 1:1. Once Phase 2 consumers are gone, the `artist` prop can be removed.

> Don't delete the `Artist` type yet — `entities/studio/api/load-with-photos.ts.loadArtistWithPhoto` still re-exports it and the existing `master-strip` may still reference it briefly during this task.

- [ ] **Step 2: Create `MastersListPage`**

`views/masters-list/ui/masters-list-page.tsx` — a simple grid/stack of master cards (portrait + name + role + years + view link to `/master/[slug]`). Reuse `SpotlightCard` for visual continuity with the rest of the studio site.

```tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import type { Master } from "@/entities/master";

interface Props {
  masters: readonly Master[];
}

export async function MastersListPage({ masters }: Props) {
  const t = await getTranslations("Master");
  return (
    <div className="pb-10">
      <AppHeader back="/home" title={t("plate_title")} />
      <section className="px-[22px] py-6">
        <h1 className="mb-4 font-display text-h1 font-light italic">{t("plate_title")}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {masters.map((m) => (
            <Link key={m.id} href={`/master/${m.id}`}>
              <SpotlightCard className="overflow-hidden rounded-[20px]">
                {m.image ? (
                  <Image
                    src={m.image.src}
                    alt={m.image.alt ?? m.name}
                    width={400}
                    height={480}
                    sizes="(max-width: 420px) 100vw, 420px"
                    className="aspect-[1/1.2] w-full object-cover"
                  />
                ) : (
                  <div aria-hidden className="aspect-[1/1.2] w-full bg-surface" />
                )}
                <div className="p-4">
                  <h2 className="text-h3 font-display">{m.name}</h2>
                  <p className="text-[12px] text-text-2">{m.role}</p>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Fork in `app/[locale]/master/page.tsx`**

```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadMastersForLocale } from "@/entities/master";
import { loadTestimonialsWithPhotos } from "@/entities/studio/api/load-with-photos";
import { MasterPage } from "@/views/master";
import { MastersListPage } from "@/views/masters-list";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Master" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function MasterRoute({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const masters = await loadMastersForLocale(locale as "en" | "ru" | "be", {
    publishedOnly: true,
  });
  if (masters.length === 1) {
    const testimonials = await loadTestimonialsWithPhotos();
    return <MasterPage master={masters[0]} testimonials={testimonials} />;
  }
  return <MastersListPage masters={masters} />;
}
```

- [ ] **Step 4: Dynamic route `app/[locale]/master/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadMasterBySlugForLocale } from "@/entities/master";
import { loadTestimonialsWithPhotos } from "@/entities/studio/api/load-with-photos";
import { MasterPage } from "@/views/master";

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Master" });
  const master = await loadMasterBySlugForLocale(slug, locale as "en" | "ru" | "be");
  if (!master) return { title: `Violetta — ${t("meta_title")}` };
  return { title: `Violetta — ${master.name}` };
}

export default async function MasterDetailRoute({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const master = await loadMasterBySlugForLocale(slug, locale as "en" | "ru" | "be");
  if (!master || master.status !== "published") notFound();
  const testimonials = await loadTestimonialsWithPhotos();
  return <MasterPage master={master} testimonials={testimonials} />;
}
```

- [ ] **Step 5: Lift home strip**

`views/home/ui/sections/master-strip.tsx` — change the prop from `Artist` to `Master`. The page component (`app/[locale]/home/page.tsx`) loads `loadMastersForLocale(locale, { publishedOnly: true })` and passes the first one (sort_order = 0) into the strip. The strip's link target stays `/master` — the route handles the fork.

If `loadMastersForLocale` returns empty (no masters), the strip renders nothing (or a placeholder); the current implementation has graceful fallbacks for missing `image`.

- [ ] **Step 6: Build + tests**

Run: `npm run build && npx vitest run --pool=threads`
Expected: green. The route table should now include `/[locale]/master` (dynamic) and `/[locale]/master/[slug]`.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/master/ views/master/ui/master-page.tsx views/masters-list/ views/home/ui/sections/master-strip.tsx app/[locale]/home/page.tsx
git commit -m "feat(master): DB-backed /master + /master/[slug] route + list view"
```

---

## Task 15: Drop `STUDIO_DATA.artist` + clean up old `Artist` re-exports

**Files:**
- Modify: `entities/studio/model/data.ts` (delete the `artist` const)
- Modify: `entities/studio/api/load-with-photos.ts` (delete `loadArtistWithPhoto`)
- Modify: `entities/studio/index.ts` (drop the `Artist` re-export)
- Modify: `entities/studio/model/types.ts` (delete the `Artist` interface)
- Verify nothing in the repo still imports `Artist` or `STUDIO_DATA.artist` (run `grep -rn "STUDIO_DATA.artist\|loadArtistWithPhoto\|: Artist\b" --include="*.ts" --include="*.tsx"`).

- [ ] **Step 1: Run the grep first**

Run: `grep -rn "STUDIO_DATA.artist\|loadArtistWithPhoto\|\bArtist\b" --include="*.ts" --include="*.tsx" .`
Expected: only matches in `entities/studio/*` and `views/master/ui/master-page.tsx`. If anything else references `Artist`, lift it onto `Master` first.

- [ ] **Step 2: Delete the artist exports**

In order:
1. Remove `loadArtistWithPhoto` from `entities/studio/api/load-with-photos.ts`
2. Remove `Artist` from `entities/studio/index.ts` (the re-export line)
3. Remove the `Artist` interface from `entities/studio/model/types.ts`
4. Remove the `artist` const from `entities/studio/model/data.ts` and from `STUDIO_DATA`
5. In `views/master/ui/master-page.tsx`, remove the `artist?: Artist` prop and rename internal references

- [ ] **Step 3: Build + tests**

Run: `npm run build && npx vitest run --pool=threads && npx eslint .`
Expected: green. Any stale import surfaces immediately.

- [ ] **Step 4: Commit**

```bash
git add entities/studio/ views/master/ui/master-page.tsx
git commit -m "refactor(studio): drop STUDIO_DATA.artist now that masters are DB-backed"
```

---

## Task 16: E2E spec for `/admin/masters` + run the full test suite

**Files:**
- Create: `e2e/admin-masters.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";

// Mirrors e2e/vip-request.spec.ts and e2e/admin-services.spec.ts.
// Once TELEGRAM_BOT_TOKEN lands the admin routes redirect to /sign-in;
// the admin fixture isn't wired yet.
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin masters list renders Published group", async ({ page }) => {
  await page.goto("/en/admin/masters");
  await expect(
    page.getByRole("heading", { level: 1, name: /Masters/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Published$/ }),
  ).toBeVisible();
});

test("New master link navigates to the editor", async ({ page }) => {
  await page.goto("/en/admin/masters");
  await page.getByRole("link", { name: /New master/i }).click();
  await expect(page).toHaveURL(/\/admin\/masters\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /New master/i }),
  ).toBeVisible();
});

test("master editor surfaces inline validation on empty locale", async ({
  page,
}) => {
  await page.goto("/en/admin/masters/violetta");
  const ruBio = page.getByLabel(/Bio \(Russian\)/);
  await expect(ruBio).toBeVisible();
  await ruBio.fill("");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/Required/).first()).toBeVisible();
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run e2e -- e2e/admin-masters.spec.ts`
Expected: all 3 specs pass against the dev server with the seeded Violetta row.

- [ ] **Step 3: Run the full suite**

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: green across the board. Lint clean, all Vitest passes, build succeeds, full Playwright suite passes (including the existing `e2e/master.spec.ts` if any — confirm the single-master path still renders the hero).

- [ ] **Step 4: Commit**

```bash
git add e2e/admin-masters.spec.ts
git commit -m "test(e2e): /admin/masters list + new-master link + inline validation"
```

---

## Final step: open the PR

- [ ] **Open the PR against `develop`** (mirror the services Phase 1 PR shape)

```bash
git push -u origin feature/admin-masters-phase-1
gh pr create --base develop --title "feat: admin masters management — phase 1 (lift-and-shift + admin CRUD)" --body "$(cat <<'EOF'
## Summary
Phase 1 of the admin masters work — see [spec](docs/superpowers/specs/2026-05-22-admin-masters-management-design.md).

- New `masters` table + `master_services` many-to-many join, seeded with Violetta + her current published services.
- Admin CRUD UI at `/admin/masters` (list with drag-reorder + draft/published/archived sections; editor with slug, status, years, name/role/bio/quote in en/ru/be, specialty picker, photo slot).
- `/master` page now forks on published-master count: 1 → existing single-hero layout, 2+ → list view linking to `/master/[slug]`.
- `listPublishedServices()` now hides services with no published master (falls through to unfiltered when the masters table has no published rows, so first-run installs aren't dead).
- Photo slot listing derives master slots from the DB instead of hardcoding "violetta".
- `STUDIO_DATA.artist` dropped — every consumer is on the DB loader.
- No booking-flow changes in this PR (Phase 2 wires `bookings.master_id` + the master step).

## Test plan
- [ ] `/en/admin/masters` lists Violetta under Published.
- [ ] Open Violetta in the editor; blank the RU bio; Save → inline "Required" error.
- [ ] Uncheck a service in the Specialty picker; Save → reload confirms the change.
- [ ] `/en/master` still renders the single-hero layout (only Violetta is published).
- [ ] Add a second published master in admin → `/en/master` now lists both, links to `/en/master/{slug}`.
- [ ] `lint`, `test`, `build`, full Playwright suite all green locally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 2 (out of scope for this plan)

- `bookings.master_id` column + migration + index + backfill
- New `master` booking step
- Auto-skip when 1 eligible master
- `masterId` validation at submit (server-side eligibility re-check)
- Admin bookings list: new Master column
- GCal invite title includes master name
- Archive guard counts upcoming bookings (replace the Phase 1 stub in `countUpcomingBookingsForMaster`)
- E2E: 1-master auto-skip + 2-master path
