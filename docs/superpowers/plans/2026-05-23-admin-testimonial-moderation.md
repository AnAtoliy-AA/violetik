# Admin Testimonial Moderation + Real Reviews — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin approve/reject moderation for the existing `testimonials` table and replace every `STUDIO_DATA.testimonials` usage on the public surfaces with real approved rows.

**Architecture:** Mirror the `vip-requests-admin` slice — DB layer extends `db/testimonials.ts` with status-conditional UPDATE + bucket queries; `features/testimonials-admin/` owns server actions and decision UI; `entities/testimonial/` owns the public read loader; `views/admin-testimonials/` composes the moderation page. Customer-facing surfaces (master detail, home card) accept an `ApprovedTestimonial[]` prop and render nothing when empty — no mock fallback.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM on Postgres, next-intl, Auth.js v5, Vitest + RTL + Storybook (vitest project), Playwright e2e, Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-05-23-admin-testimonial-moderation-design.md](docs/superpowers/specs/2026-05-23-admin-testimonial-moderation-design.md)

**Branch:** `feature/admin-testimonial-moderation` (already created off `develop`).

---

## Conventions

- **TDD red→green→commit.** Each task: write the failing test → run it (FAIL) → minimal implementation → run it (PASS) → commit.
- **Reference precedents** for nearly every task. The codebase already has the patterns; copy them.
- Commit message format follows the repo convention visible in `git log --oneline -20` — lowercase scope, present tense (`feat(scope): ...`, `test(scope): ...`, `refactor(scope): ...`, `docs(scope): ...`, `i18n(scope): ...`).
- **Button variants** available: `"solid" | "gold" | "outline"` (confirmed in [shared/ui/button/ui/button.tsx:35](shared/ui/button/ui/button.tsx#L35)). Approve = `gold`, Reject = `outline` (mirrors `RequestActions` at [features/vip-requests-admin/ui/request-actions.tsx](features/vip-requests-admin/ui/request-actions.tsx)).
- **Auth gate posture:** all admin sub-routes use unconditional `requireAdmin()` + `redirect({ href: "/sign-in", locale })`, mirroring [app/[locale]/admin/vip-requests/page.tsx:60-61](app/[locale]/admin/vip-requests/page.tsx#L60). Only the `/admin` root is env-gated.
- **i18n shape:** add one key to `Admin.*` (`inbox_testimonials`) and the full `AdminTestimonials.*` namespace; existing `Profile.testimonial_*` keys remain.
- **Don't touch `node_modules/`, `package.json`, or `package-lock.json`** — no new dependencies.
- **`db/` tests** follow the repo's existing pattern: `it.skipIf(Boolean(process.env.DATABASE_URL))` no-DB branches only. The spec (§11.1) calls for live-DB integration tests for the new admin queries, but the repo has no precedent for live-DB tests in `db/*.test.ts` (verified against `db/testimonials.test.ts`, `db/bookings.test.ts`). We **defer live-DB integration tests as a follow-up**; this PR ships the no-DB contract tests + the unit tests on the entity loader / actions / UI which cover the call paths.
- **`revalidatePath("/", "layout")`** after every successful admin action — the master + home + admin pages all need to refresh.

---

## File Map

**New:**

```
db/testimonials.ts                                    # extend (Task 2)
entities/testimonial/index.ts                         # Task 3
entities/testimonial/api/load-approved.ts             # Task 3
entities/testimonial/api/load-approved.test.ts        # Task 3
entities/testimonial/lib/build-author-display.ts      # Task 1
entities/testimonial/lib/build-author-display.test.ts # Task 1
entities/testimonial/model/types.ts                   # Task 3
features/testimonials-admin/index.ts                  # Task 4
features/testimonials-admin/api/actions.ts            # Task 4
features/testimonials-admin/api/actions.test.ts       # Task 4
features/testimonials-admin/ui/decision-actions.tsx   # Task 5
features/testimonials-admin/ui/decision-actions.stories.tsx # Task 5
features/testimonials-admin/ui/decision-actions.test.tsx    # Task 5
features/testimonials-admin/ui/testimonial-row.tsx    # Task 6
features/testimonials-admin/ui/testimonial-row.stories.tsx # Task 6
features/testimonials-admin/ui/testimonial-row.test.tsx    # Task 6
views/admin-testimonials/index.ts                     # Task 7
views/admin-testimonials/ui/admin-testimonials-page.tsx # Task 7
views/admin-testimonials/ui/admin-testimonials-page.test.tsx # Task 7
views/master/ui/master-page.test.tsx                  # Task 11 (new — none existed)
views/home/ui/sections/testimonial-card.test.tsx      # Task 13 (new — none existed)
app/[locale]/admin/testimonials/page.tsx              # Task 8
e2e/admin-testimonials.spec.ts                        # Task 17
```

**Modified:**

```
app/[locale]/admin/page.tsx                # Task 9
messages/en.json                           # Task 10
messages/ru.json                           # Task 10
messages/be.json                           # Task 10
views/master/ui/master-page.tsx            # Task 11
app/[locale]/master/page.tsx               # Task 12
app/[locale]/master/[slug]/page.tsx        # Task 12
views/home/ui/sections/testimonial-card.tsx # Task 13
views/home/ui/home-page.tsx                # Task 14
app/[locale]/home/page.tsx                 # Task 14
entities/studio/model/data.ts              # Task 15
entities/studio/model/types.ts             # Task 15
entities/studio/index.ts                   # Task 15
entities/studio/api/load-with-photos.ts    # Task 15
features/photo-upload-admin/model/slot.ts  # Task 16
features/photo-upload-admin/model/slot.test.ts # Task 16 (if exists)
```

---

## Task 1: Author-display helper

Pure function with email-head fallback. Shared between the entity loader (Task 3) and the admin row UI (Task 6).

**Files:**
- Create: `entities/testimonial/lib/build-author-display.ts`
- Create: `entities/testimonial/lib/build-author-display.test.ts`

- [ ] **Step 1.1: Write the failing test**

`entities/testimonial/lib/build-author-display.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildAuthorDisplay } from "./build-author-display";

describe("buildAuthorDisplay", () => {
  it("returns firstName + last-initial when both present", () => {
    expect(
      buildAuthorDisplay({
        firstName: "Lara",
        lastName: "Karimova",
        username: "lara_k",
        email: "lara@example.com",
      }),
    ).toBe("Lara K.");
  });

  it("returns firstName alone when no lastName", () => {
    expect(
      buildAuthorDisplay({
        firstName: "Lara",
        lastName: null,
        username: null,
        email: null,
      }),
    ).toBe("Lara");
  });

  it("falls back to username when no first/last name", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: "lara_k",
        email: null,
      }),
    ).toBe("lara_k");
  });

  it("falls back to a 2-char email head + ellipsis when no name/username", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: null,
        email: "ali@gmail.com",
      }),
    ).toBe("al…");
  });

  it("returns short email head as-is when it's <= 2 chars", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: null,
        email: "a@x.com",
      }),
    ).toBe("a");
  });

  it("falls back to 'Guest' when every field is null", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: null,
        email: null,
      }),
    ).toBe("Guest");
  });
});
```

- [ ] **Step 1.2: Run test, verify FAIL**

```
npx vitest run entities/testimonial/lib/build-author-display.test.ts
```

Expected: 6 failing tests with "Cannot find module './build-author-display'".

- [ ] **Step 1.3: Write the implementation**

`entities/testimonial/lib/build-author-display.ts`:

```ts
export interface BuildAuthorDisplayInput {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
}

export function buildAuthorDisplay(u: BuildAuthorDisplayInput): string {
  if (u.firstName) {
    const initial = u.lastName ? ` ${u.lastName.trim().charAt(0)}.` : "";
    return `${u.firstName}${initial}`;
  }
  if (u.username) return u.username;
  if (u.email) {
    const at = u.email.indexOf("@");
    const head = at > 0 ? u.email.slice(0, at) : u.email;
    return head.length <= 2 ? head : `${head.slice(0, 2)}…`;
  }
  return "Guest";
}
```

- [ ] **Step 1.4: Run test, verify PASS**

```
npx vitest run entities/testimonial/lib/build-author-display.test.ts
```

Expected: 6 passing.

- [ ] **Step 1.5: Commit**

```bash
git add entities/testimonial/lib/build-author-display.ts entities/testimonial/lib/build-author-display.test.ts
git commit -m "feat(entities/testimonial): author display helper with email-head fallback"
```

---

## Task 2: DB layer — admin queries + decide mutation

Extend `db/testimonials.ts` with `listTestimonialsByStatus`, `decideTestimonial`, `countPendingTestimonials`. Mirror the `vip-requests` shape at [db/vip-requests.ts:62-90, 184-247](db/vip-requests.ts#L62).

**Files:**
- Modify: `db/testimonials.ts`
- Modify: `db/testimonials.test.ts`

- [ ] **Step 2.1: Write the failing tests**

Append to `db/testimonials.test.ts`:

```ts
import {
  listTestimonialsByStatus,
  decideTestimonial,
  countPendingTestimonials,
} from "./testimonials";

describe("listTestimonialsByStatus (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns an empty array when DATABASE_URL is unset",
    async () => {
      expect(await listTestimonialsByStatus("pending")).toEqual([]);
      expect(await listTestimonialsByStatus("approved")).toEqual([]);
      expect(await listTestimonialsByStatus("rejected")).toEqual([]);
    },
  );
});

describe("decideTestimonial (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns null when DATABASE_URL is unset",
    async () => {
      expect(
        await decideTestimonial({
          id: "tst_1",
          action: "approve",
          decidedBy: "tg:1",
        }),
      ).toBeNull();
      expect(
        await decideTestimonial({
          id: "tst_1",
          action: "reject",
          decidedBy: "tg:1",
        }),
      ).toBeNull();
    },
  );
});

describe("countPendingTestimonials (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns 0 when DATABASE_URL is unset",
    async () => {
      expect(await countPendingTestimonials()).toBe(0);
    },
  );
});
```

- [ ] **Step 2.2: Run tests, verify FAIL**

```
npx vitest run db/testimonials.test.ts
```

Expected: import errors on the three new symbols.

- [ ] **Step 2.3: Implement the three exports**

> Note: `db/testimonials.ts` already defines a private `isMissingTable` helper at line 19. The appended code reuses it — **do not redeclare it**.

Append to `db/testimonials.ts`:

```ts
import { and, desc, eq, sql } from "drizzle-orm";

export interface AdminTestimonialRow {
  id: string;
  body: string;
  status: schema.TestimonialStatus;
  createdAt: Date;
  decidedAt: Date | null;
  userId: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorUsername: string | null;
  authorEmail: string | null;
  authorPhotoUrl: string | null;
  masterId: string;
  masterNameEn: string;
  masterNameRu: string;
  masterNameBe: string;
}

export async function listTestimonialsByStatus(
  status: schema.TestimonialStatus,
): Promise<AdminTestimonialRow[]> {
  if (!db) return [];
  try {
    const orderCol =
      status === "approved"
        ? desc(schema.testimonials.decidedAt)
        : desc(schema.testimonials.createdAt);
    const rows = await db
      .select({
        id: schema.testimonials.id,
        body: schema.testimonials.body,
        status: schema.testimonials.status,
        createdAt: schema.testimonials.createdAt,
        decidedAt: schema.testimonials.decidedAt,
        userId: schema.testimonials.userId,
        authorFirstName: schema.users.firstName,
        authorLastName: schema.users.lastName,
        authorUsername: schema.users.username,
        authorEmail: schema.users.email,
        authorPhotoUrl: schema.users.photoUrl,
        masterId: schema.testimonials.masterId,
        masterNameEn: schema.masters.nameEn,
        masterNameRu: schema.masters.nameRu,
        masterNameBe: schema.masters.nameBe,
      })
      .from(schema.testimonials)
      .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
      .leftJoin(
        schema.masters,
        eq(schema.testimonials.masterId, schema.masters.id),
      )
      .where(eq(schema.testimonials.status, status))
      .orderBy(orderCol);
    // leftJoin nullables — the FK in schema is NOT NULL, so in practice
    // master/user fields are always present. Coerce defensively.
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt,
      userId: r.userId,
      authorFirstName: r.authorFirstName,
      authorLastName: r.authorLastName,
      authorUsername: r.authorUsername,
      authorEmail: r.authorEmail,
      authorPhotoUrl: r.authorPhotoUrl,
      masterId: r.masterId,
      masterNameEn: r.masterNameEn ?? "",
      masterNameRu: r.masterNameRu ?? "",
      masterNameBe: r.masterNameBe ?? "",
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export type DecideTestimonialInput =
  | { id: string; action: "approve"; decidedBy: string }
  | { id: string; action: "reject"; decidedBy: string };

export async function decideTestimonial(
  input: DecideTestimonialInput,
): Promise<schema.Testimonial | null> {
  if (!db) return null;
  const now = new Date();
  const nextStatus = input.action === "approve" ? "approved" : "rejected";
  try {
    const rows = await db
      .update(schema.testimonials)
      .set({
        status: nextStatus,
        decidedAt: now,
        decidedBy: input.decidedBy,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.testimonials.id, input.id),
          eq(schema.testimonials.status, "pending"),
        ),
      )
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function countPendingTestimonials(): Promise<number> {
  if (!db) return 0;
  try {
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.testimonials)
      .where(eq(schema.testimonials.status, "pending"));
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    throw error;
  }
}
```

Imports at the top of `db/testimonials.ts` need to be extended:

```ts
import { and, desc, eq, sql } from "drizzle-orm";
// existing imports continue (db, schema, randomBytes)
```

- [ ] **Step 2.4: Run tests, verify PASS**

```
npx vitest run db/testimonials.test.ts
```

Expected: existing 4 + new 3 = 7 passing (or skipped if `DATABASE_URL` is set).

- [ ] **Step 2.5: Run lint to confirm no type errors**

```
npm run lint
```

Expected: clean.

- [ ] **Step 2.6: Commit**

```bash
git add db/testimonials.ts db/testimonials.test.ts
git commit -m "feat(db/testimonials): admin queries + decideTestimonial mutation"
```

---

## Task 3: Entity loader — `listApprovedTestimonials`

Public read loader for the master + home surfaces. Joins `users` for author display fields.

**Files:**
- Create: `entities/testimonial/model/types.ts`
- Create: `entities/testimonial/api/load-approved.ts`
- Create: `entities/testimonial/api/load-approved.test.ts`
- Create: `entities/testimonial/index.ts`

- [ ] **Step 3.1: Create the type module**

`entities/testimonial/model/types.ts`:

```ts
export interface ApprovedTestimonial {
  id: string;
  body: string;
  createdAt: Date;
  authorDisplay: string;
  authorPhotoUrl: string | null;
  masterId: string;
}
```

- [ ] **Step 3.2: Write the failing tests**

`entities/testimonial/api/load-approved.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { listApprovedTestimonials } from "./load-approved";

describe("listApprovedTestimonials (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns an empty array when DATABASE_URL is unset",
    async () => {
      expect(await listApprovedTestimonials()).toEqual([]);
      expect(
        await listApprovedTestimonials({ masterId: "m1", limit: 5 }),
      ).toEqual([]);
    },
  );
});
```

- [ ] **Step 3.3: Run tests, verify FAIL**

```
npx vitest run entities/testimonial/api/load-approved.test.ts
```

Expected: module-not-found.

- [ ] **Step 3.4: Implement the loader**

`entities/testimonial/api/load-approved.ts`:

```ts
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { buildAuthorDisplay } from "../lib/build-author-display";
import type { ApprovedTestimonial } from "../model/types";

export interface ListApprovedTestimonialsOptions {
  masterId?: string;
  limit?: number;
}

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

export async function listApprovedTestimonials(
  options: ListApprovedTestimonialsOptions = {},
): Promise<ApprovedTestimonial[]> {
  if (!db) return [];
  const limit = options.limit ?? 20;
  const where = options.masterId
    ? and(
        eq(schema.testimonials.status, "approved"),
        eq(schema.testimonials.masterId, options.masterId),
      )
    : eq(schema.testimonials.status, "approved");
  try {
    const rows = await db
      .select({
        id: schema.testimonials.id,
        body: schema.testimonials.body,
        createdAt: schema.testimonials.createdAt,
        masterId: schema.testimonials.masterId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        username: schema.users.username,
        email: schema.users.email,
        photoUrl: schema.users.photoUrl,
      })
      .from(schema.testimonials)
      .leftJoin(schema.users, eq(schema.testimonials.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.testimonials.decidedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      masterId: r.masterId,
      authorDisplay: buildAuthorDisplay({
        firstName: r.firstName,
        lastName: r.lastName,
        username: r.username,
        email: r.email,
      }),
      authorPhotoUrl: r.photoUrl,
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
```

- [ ] **Step 3.5: Create the public barrel**

`entities/testimonial/index.ts`:

```ts
export { listApprovedTestimonials } from "./api/load-approved";
export type { ListApprovedTestimonialsOptions } from "./api/load-approved";
export { buildAuthorDisplay } from "./lib/build-author-display";
export type { BuildAuthorDisplayInput } from "./lib/build-author-display";
export type { ApprovedTestimonial } from "./model/types";
```

- [ ] **Step 3.6: Run tests, verify PASS**

```
npx vitest run entities/testimonial/
```

Expected: 6 (helper) + 1 (loader) = 7 passing.

- [ ] **Step 3.7: Lint**

```
npm run lint
```

- [ ] **Step 3.8: Commit**

```bash
git add entities/testimonial/
git commit -m "feat(entities/testimonial): public approved-testimonial loader"
```

---

## Task 4: Server actions — approve + reject

Mirror `features/vip-requests-admin/api/actions.ts`.

**Files:**
- Create: `features/testimonials-admin/api/actions.ts`
- Create: `features/testimonials-admin/api/actions.test.ts`
- Create: `features/testimonials-admin/index.ts` (skeleton — UI exports added in Task 5/6)

- [ ] **Step 4.1: Write the failing test**

`features/testimonials-admin/api/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/testimonials", () => ({ decideTestimonial: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import { decideTestimonial } from "@/db/testimonials";
import { revalidatePath } from "next/cache";
import { approveTestimonial, rejectTestimonial } from "./actions";

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(decideTestimonial).mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("approveTestimonial", () => {
  it("returns {ok:false, reason:'unauthorized'} when not signed in", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "unauthorized" });
    expect(await approveTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("returns {ok:false, reason:'forbidden'} for non-admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await approveTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("returns {ok:false, reason:'not-found'} when decideTestimonial returns null", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue(null);
    expect(await approveTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("calls decideTestimonial with action='approve' and revalidates on success", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue({ id: "tst_1" } as never);
    expect(await approveTestimonial("tst_1")).toEqual({ ok: true, id: "tst_1" });
    expect(decideTestimonial).toHaveBeenCalledWith({
      id: "tst_1",
      action: "approve",
      decidedBy: "tg:a",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("rejectTestimonial", () => {
  it("calls decideTestimonial with action='reject' on success", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue({ id: "tst_1" } as never);
    expect(await rejectTestimonial("tst_1")).toEqual({ ok: true, id: "tst_1" });
    expect(decideTestimonial).toHaveBeenCalledWith({
      id: "tst_1",
      action: "reject",
      decidedBy: "tg:a",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns {ok:false, reason:'not-found'} when row is already decided", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue(null);
    expect(await rejectTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
```

- [ ] **Step 4.2: Run tests, verify FAIL**

```
npx vitest run features/testimonials-admin/api/actions.test.ts
```

Expected: module-not-found.

- [ ] **Step 4.3: Implement the actions**

`features/testimonials-admin/api/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import { decideTestimonial } from "@/db/testimonials";

export type AdminTestimonialActionResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "forbidden" | "not-found" };

export async function approveTestimonial(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideTestimonial({
    id,
    action: "approve",
    decidedBy: gate.user.id,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function rejectTestimonial(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideTestimonial({
    id,
    action: "reject",
    decidedBy: gate.user.id,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
```

`features/testimonials-admin/index.ts`:

```ts
export { approveTestimonial, rejectTestimonial } from "./api/actions";
export type { AdminTestimonialActionResult } from "./api/actions";
```

- [ ] **Step 4.4: Run tests, verify PASS**

```
npx vitest run features/testimonials-admin/
```

Expected: 6 passing.

- [ ] **Step 4.5: Commit**

```bash
git add features/testimonials-admin/
git commit -m "feat(testimonials-admin): approveTestimonial + rejectTestimonial actions"
```

---

## Task 5: `<DecisionActions>` — client UI for approve/reject

Two `<form action>` buttons inside a `useTransition`. Mirrors [features/vip-requests-admin/ui/request-actions.tsx](features/vip-requests-admin/ui/request-actions.tsx).

**Files:**
- Create: `features/testimonials-admin/ui/decision-actions.tsx`
- Create: `features/testimonials-admin/ui/decision-actions.test.tsx`
- Create: `features/testimonials-admin/ui/decision-actions.stories.tsx`

- [ ] **Step 5.1: Write the failing test**

`features/testimonials-admin/ui/decision-actions.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api/actions", () => ({
  approveTestimonial: vi.fn(),
  rejectTestimonial: vi.fn(),
}));

import { approveTestimonial, rejectTestimonial } from "../api/actions";
import { DecisionActions } from "./decision-actions";

beforeEach(() => {
  vi.mocked(approveTestimonial).mockReset();
  vi.mocked(rejectTestimonial).mockReset();
});

describe("DecisionActions", () => {
  it("renders Approve and Reject buttons with provided labels", () => {
    render(
      <DecisionActions
        testimonialId="tst_1"
        approveLabel="Approve"
        rejectLabel="Reject"
      />,
    );
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("calls approveTestimonial(id) when Approve is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(approveTestimonial).mockResolvedValue({ ok: true, id: "tst_1" });
    render(
      <DecisionActions
        testimonialId="tst_1"
        approveLabel="Approve"
        rejectLabel="Reject"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(approveTestimonial).toHaveBeenCalledWith("tst_1");
  });

  it("calls rejectTestimonial(id) when Reject is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(rejectTestimonial).mockResolvedValue({ ok: true, id: "tst_1" });
    render(
      <DecisionActions
        testimonialId="tst_1"
        approveLabel="Approve"
        rejectLabel="Reject"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(rejectTestimonial).toHaveBeenCalledWith("tst_1");
  });
});
```

- [ ] **Step 5.2: Run test, verify FAIL**

```
npx vitest run features/testimonials-admin/ui/decision-actions.test.tsx
```

- [ ] **Step 5.3: Implement the component**

`features/testimonials-admin/ui/decision-actions.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { approveTestimonial, rejectTestimonial } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface DecisionActionsProps {
  testimonialId: string;
  approveLabel: string;
  rejectLabel: string;
}

export function DecisionActions({
  testimonialId,
  approveLabel,
  rejectLabel,
}: DecisionActionsProps) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        action={() =>
          startTransition(async () => {
            await approveTestimonial(testimonialId);
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName({ variant: "gold", size: "sm" })}
        >
          {approveLabel}
        </button>
      </form>
      <form
        action={() =>
          startTransition(async () => {
            await rejectTestimonial(testimonialId);
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {rejectLabel}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5.4: Run test, verify PASS**

```
npx vitest run features/testimonials-admin/ui/decision-actions.test.tsx
```

- [ ] **Step 5.5: Write the story**

`features/testimonials-admin/ui/decision-actions.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DecisionActions } from "./decision-actions";

const meta: Meta<typeof DecisionActions> = {
  title: "Features/TestimonialsAdmin/DecisionActions",
  component: DecisionActions,
};
export default meta;

export const Default: StoryObj<typeof DecisionActions> = {
  args: {
    testimonialId: "tst_demo",
    approveLabel: "Approve",
    rejectLabel: "Reject",
  },
};
```

- [ ] **Step 5.6: Update barrel**

Append to `features/testimonials-admin/index.ts`:

```ts
export { DecisionActions } from "./ui/decision-actions";
export type { DecisionActionsProps } from "./ui/decision-actions";
```

- [ ] **Step 5.7: Run all tests + stories**

```
npm test
```

Expected: clean.

- [ ] **Step 5.8: Commit**

```bash
git add features/testimonials-admin/
git commit -m "feat(testimonials-admin): DecisionActions buttons + story"
```

---

## Task 6: `<TestimonialRow>` — server-component row UI

Body, master name (locale-resolved), author display, timestamp, status badge, optional decision slot.

**Files:**
- Create: `features/testimonials-admin/ui/testimonial-row.tsx`
- Create: `features/testimonials-admin/ui/testimonial-row.test.tsx`
- Create: `features/testimonials-admin/ui/testimonial-row.stories.tsx`

- [ ] **Step 6.1: Write the failing test**

`features/testimonials-admin/ui/testimonial-row.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialRow } from "./testimonial-row";
import type { AdminTestimonialRow } from "@/db/testimonials";

const baseRow: AdminTestimonialRow = {
  id: "tst_1",
  body: "Beautiful work — the chrome finish lasted three weeks.",
  status: "pending",
  createdAt: new Date("2026-05-20T10:00:00Z"),
  decidedAt: null,
  userId: "tg:42",
  authorFirstName: "Lara",
  authorLastName: "Karimova",
  authorUsername: "lara_k",
  authorEmail: null,
  authorPhotoUrl: null,
  masterId: "violetta",
  masterNameEn: "Violetta",
  masterNameRu: "Виолетта",
  masterNameBe: "Віялета",
};

const labels = {
  submittedAt: "Submitted",
  decidedAt: "Decided",
  statusPending: "Pending",
  statusApproved: "Approved",
  statusRejected: "Rejected",
};

describe("TestimonialRow", () => {
  it("renders body, author display, and master name in the requested locale", () => {
    render(<TestimonialRow row={baseRow} locale="ru" labels={labels} />);
    expect(screen.getByText(baseRow.body)).toBeInTheDocument();
    expect(screen.getByText("Lara K.")).toBeInTheDocument();
    expect(screen.getByText("Виолетта")).toBeInTheDocument();
  });

  it("shows the decision slot when provided", () => {
    render(
      <TestimonialRow
        row={baseRow}
        locale="en"
        labels={labels}
        decisionSlot={<button>Approve me</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Approve me" }),
    ).toBeInTheDocument();
  });

  it("omits the decision slot for approved/rejected rows", () => {
    const approved = { ...baseRow, status: "approved" as const };
    render(<TestimonialRow row={approved} locale="en" labels={labels} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the status badge matching row.status", () => {
    const rejected = { ...baseRow, status: "rejected" as const };
    render(<TestimonialRow row={rejected} locale="en" labels={labels} />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6.2: Run test, verify FAIL**

```
npx vitest run features/testimonials-admin/ui/testimonial-row.test.tsx
```

- [ ] **Step 6.3: Implement the component**

`features/testimonials-admin/ui/testimonial-row.tsx`:

```tsx
import type { ReactNode } from "react";
import Image from "next/image";
import { buildAuthorDisplay } from "@/entities/testimonial";
import type { AdminTestimonialRow } from "@/db/testimonials";
import type { TestimonialStatus } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

export interface TestimonialRowLabels {
  submittedAt: string;
  decidedAt: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
}

export interface TestimonialRowProps {
  row: AdminTestimonialRow;
  locale: Locale;
  labels: TestimonialRowLabels;
  decisionSlot?: ReactNode;
}

function statusLabel(s: TestimonialStatus, labels: TestimonialRowLabels): string {
  if (s === "approved") return labels.statusApproved;
  if (s === "rejected") return labels.statusRejected;
  return labels.statusPending;
}

function masterName(row: AdminTestimonialRow, locale: Locale): string {
  if (locale === "ru") return row.masterNameRu;
  if (locale === "be") return row.masterNameBe;
  return row.masterNameEn;
}

const FMT: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en", { dateStyle: "medium" }),
  ru: new Intl.DateTimeFormat("ru", { dateStyle: "medium" }),
  be: new Intl.DateTimeFormat("be", { dateStyle: "medium" }),
};

export function TestimonialRow({
  row,
  locale,
  labels,
  decisionSlot,
}: TestimonialRowProps) {
  const author = buildAuthorDisplay({
    firstName: row.authorFirstName,
    lastName: row.authorLastName,
    username: row.authorUsername,
    email: row.authorEmail,
  });
  const dim = row.status === "rejected" ? "opacity-60" : "";
  return (
    <li className={`gilded rounded-[18px] p-5 ${dim}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {row.authorPhotoUrl ? (
            <span className="relative size-7 overflow-hidden rounded-full">
              <Image
                src={row.authorPhotoUrl}
                alt={author}
                fill
                sizes="28px"
                unoptimized
                className="object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden
              className="size-7 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, var(--color-rose), var(--color-plum))",
              }}
            />
          )}
          <span className="font-display text-[18px] italic">{author}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {statusLabel(row.status, labels)}
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-[1.55] text-text-2">{row.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
        <span>
          {labels.submittedAt}: {FMT[locale].format(row.createdAt)}
        </span>
        {row.decidedAt ? (
          <span>
            {labels.decidedAt}: {FMT[locale].format(row.decidedAt)}
          </span>
        ) : null}
        <span>· {masterName(row, locale)}</span>
      </div>
      {decisionSlot ? <div className="mt-3">{decisionSlot}</div> : null}
    </li>
  );
}
```

- [ ] **Step 6.4: Verify Telegram photo CDN is configured for `<Image unoptimized>`**

The `unoptimized` flag avoids Next's image proxy entirely (no `remotePatterns` needed). Skip any `next.config.ts` changes.

- [ ] **Step 6.5: Run test, verify PASS**

```
npx vitest run features/testimonials-admin/ui/testimonial-row.test.tsx
```

- [ ] **Step 6.6: Write the story**

`features/testimonials-admin/ui/testimonial-row.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TestimonialRow } from "./testimonial-row";
import { DecisionActions } from "./decision-actions";
import type { AdminTestimonialRow } from "@/db/testimonials";

const meta: Meta<typeof TestimonialRow> = {
  title: "Features/TestimonialsAdmin/TestimonialRow",
  component: TestimonialRow,
};
export default meta;

const baseRow: AdminTestimonialRow = {
  id: "tst_1",
  body: "Beautiful work — the chrome finish lasted three weeks.",
  status: "pending",
  createdAt: new Date("2026-05-20T10:00:00Z"),
  decidedAt: null,
  userId: "tg:42",
  authorFirstName: "Lara",
  authorLastName: "Karimova",
  authorUsername: "lara_k",
  authorEmail: null,
  authorPhotoUrl: null,
  masterId: "violetta",
  masterNameEn: "Violetta",
  masterNameRu: "Виолетта",
  masterNameBe: "Віялета",
};

const labels = {
  submittedAt: "Submitted",
  decidedAt: "Decided",
  statusPending: "Pending",
  statusApproved: "Approved",
  statusRejected: "Rejected",
};

export const Pending: StoryObj<typeof TestimonialRow> = {
  args: {
    row: baseRow,
    locale: "en",
    labels,
    decisionSlot: (
      <DecisionActions
        testimonialId={baseRow.id}
        approveLabel="Approve"
        rejectLabel="Reject"
      />
    ),
  },
};

export const Approved: StoryObj<typeof TestimonialRow> = {
  args: {
    row: { ...baseRow, status: "approved", decidedAt: new Date("2026-05-21T10:00:00Z") },
    locale: "en",
    labels,
  },
};

export const Rejected: StoryObj<typeof TestimonialRow> = {
  args: {
    row: { ...baseRow, status: "rejected", decidedAt: new Date("2026-05-21T10:00:00Z") },
    locale: "en",
    labels,
  },
};
```

- [ ] **Step 6.7: Update barrel**

Append to `features/testimonials-admin/index.ts`:

```ts
export { TestimonialRow } from "./ui/testimonial-row";
export type {
  TestimonialRowProps,
  TestimonialRowLabels,
} from "./ui/testimonial-row";
```

- [ ] **Step 6.8: Run all tests**

```
npm test
```

- [ ] **Step 6.9: Commit**

```bash
git add features/testimonials-admin/
git commit -m "feat(testimonials-admin): TestimonialRow server component + stories"
```

---

## Task 7: Admin testimonials view

Composes the three sections from pre-loaded arrays. Pure server component taking props — testable without DB.

> **Ordering:** The view test imports `messages/en.json` directly and asserts on rendered i18n strings. **Complete Task 10 (i18n keys) before starting this task.** The plan keeps the numeric ordering for narrative flow (UI → i18n → route), but execute Task 10 first.

**Files:**
- Create: `views/admin-testimonials/index.ts`
- Create: `views/admin-testimonials/ui/admin-testimonials-page.tsx`
- Create: `views/admin-testimonials/ui/admin-testimonials-page.test.tsx`

- [ ] **Step 7.1: Write the failing test**

`views/admin-testimonials/ui/admin-testimonials-page.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import { AdminTestimonialsPage } from "./admin-testimonials-page";
import type { AdminTestimonialRow } from "@/db/testimonials";

vi.mock("@/features/testimonials-admin", async () => {
  const actual = await vi.importActual<typeof import("@/features/testimonials-admin")>(
    "@/features/testimonials-admin",
  );
  return {
    ...actual,
    DecisionActions: (props: { testimonialId: string }) => (
      <div data-testid="slot">slot-{props.testimonialId}</div>
    ),
  };
});

function makeRow(overrides: Partial<AdminTestimonialRow> = {}): AdminTestimonialRow {
  return {
    id: "tst_1",
    body: "Body text",
    status: "pending",
    createdAt: new Date("2026-05-20T10:00:00Z"),
    decidedAt: null,
    userId: "tg:42",
    authorFirstName: "Lara",
    authorLastName: null,
    authorUsername: null,
    authorEmail: null,
    authorPhotoUrl: null,
    masterId: "violetta",
    masterNameEn: "Violetta",
    masterNameRu: "Виолетта",
    masterNameBe: "Віялета",
    ...overrides,
  };
}

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AdminTestimonialsPage", () => {
  it("renders three section headings with counts", () => {
    renderWithIntl(
      <AdminTestimonialsPage
        locale="en"
        pending={[makeRow({ id: "tst_p" })]}
        approved={[makeRow({ id: "tst_a", status: "approved" })]}
        rejected={[]}
      />,
    );
    expect(screen.getByText(/Pending \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Approved \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Rejected \(0\)/)).toBeInTheDocument();
  });

  it("wires the DecisionActions slot only for pending rows", () => {
    renderWithIntl(
      <AdminTestimonialsPage
        locale="en"
        pending={[makeRow({ id: "tst_p" })]}
        approved={[makeRow({ id: "tst_a", status: "approved" })]}
        rejected={[makeRow({ id: "tst_r", status: "rejected" })]}
      />,
    );
    expect(screen.getByTestId("slot")).toHaveTextContent("slot-tst_p");
    expect(screen.getAllByTestId("slot")).toHaveLength(1);
  });

  it("shows empty-state copy per section", () => {
    renderWithIntl(
      <AdminTestimonialsPage locale="en" pending={[]} approved={[]} rejected={[]} />,
    );
    expect(
      screen.getByText(/No pending reviews\. New submissions land here\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing approved yet\./)).toBeInTheDocument();
    expect(screen.getByText(/No rejected reviews\./)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run test, verify FAIL**

```
npx vitest run views/admin-testimonials/
```

- [ ] **Step 7.3: Implement the page view**

`views/admin-testimonials/ui/admin-testimonials-page.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  DecisionActions,
  TestimonialRow,
  type TestimonialRowLabels,
} from "@/features/testimonials-admin";
import type { AdminTestimonialRow } from "@/db/testimonials";
import type { Locale } from "@/i18n/routing";

export interface AdminTestimonialsPageProps {
  locale: Locale;
  pending: readonly AdminTestimonialRow[];
  approved: readonly AdminTestimonialRow[];
  rejected: readonly AdminTestimonialRow[];
}

export function AdminTestimonialsPage({
  locale,
  pending,
  approved,
  rejected,
}: AdminTestimonialsPageProps) {
  const t = useTranslations("AdminTestimonials");
  const labels: TestimonialRowLabels = {
    submittedAt: t("submitted_at"),
    decidedAt: t("decided_at"),
    statusPending: t("status_pending"),
    statusApproved: t("status_approved"),
    statusRejected: t("status_rejected"),
  };
  const approveLabel = t("cta_approve");
  const rejectLabel = t("cta_reject");

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("meta_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_pending", { n: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_pending")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((row) => (
              <TestimonialRow
                key={row.id}
                row={row}
                locale={locale}
                labels={labels}
                decisionSlot={
                  <DecisionActions
                    testimonialId={row.id}
                    approveLabel={approveLabel}
                    rejectLabel={rejectLabel}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_approved", { n: approved.length })}
        </h2>
        {approved.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_approved")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {approved.map((row) => (
              <TestimonialRow
                key={row.id}
                row={row}
                locale={locale}
                labels={labels}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_rejected", { n: rejected.length })}
        </h2>
        {rejected.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_rejected")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rejected.map((row) => (
              <TestimonialRow
                key={row.id}
                row={row}
                locale={locale}
                labels={labels}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

`views/admin-testimonials/index.ts`:

```ts
export { AdminTestimonialsPage } from "./ui/admin-testimonials-page";
export type { AdminTestimonialsPageProps } from "./ui/admin-testimonials-page";
```

- [ ] **Step 7.4: Run the view test**

With Task 10 already done (per ordering note at the top of this task), the i18n keys resolve.

```
npx vitest run views/admin-testimonials/
```

Expected: 3 passing.

- [ ] **Step 7.5: Lint**

```
npm run lint
```

- [ ] **Step 7.6: Commit**

```bash
git add views/admin-testimonials/
git commit -m "feat(views/admin-testimonials): three-bucket moderation page composition"
```

---

## Task 8: Admin route file

The route file owns the auth gate, DB reads, and passes pre-loaded arrays to the view.

**Files:**
- Create: `app/[locale]/admin/testimonials/page.tsx`

- [ ] **Step 8.1: Implement the route**

`app/[locale]/admin/testimonials/page.tsx`:

```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { listTestimonialsByStatus } from "@/db/testimonials";
import { AdminTestimonialsPage } from "@/views/admin-testimonials";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminTestimonials" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function AdminTestimonialsRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const [pending, approved, rejected] = await Promise.all([
    listTestimonialsByStatus("pending"),
    listTestimonialsByStatus("approved"),
    listTestimonialsByStatus("rejected"),
  ]);

  return (
    <AdminTestimonialsPage
      locale={locale as Locale}
      pending={pending}
      approved={approved}
      rejected={rejected}
    />
  );
}
```

- [ ] **Step 8.2: Run the lint + build to catch import/type issues**

```
npm run lint
```

(Build runs in Task 18; lint is the fast feedback loop here.)

- [ ] **Step 8.3: Commit**

```bash
git add app/[locale]/admin/testimonials/page.tsx
git commit -m "feat(admin/testimonials): route file + auth gate"
```

---

## Task 9: Admin dashboard tile

Adds the "Testimonials" tile + threads `countPendingTestimonials()` into the existing `Promise.all`.

**Files:**
- Modify: `app/[locale]/admin/page.tsx`

- [ ] **Step 9.1: Modify the dashboard route**

Edit `app/[locale]/admin/page.tsx`:

**Imports — add:**

```ts
import { countPendingTestimonials } from "@/db/testimonials";
```

**`Promise.all` block** — extend the destructure and the call (current line 52-55):

```ts
const [bookings, pendingVip, pendingTestimonials] = await Promise.all([
  listBookingsForAdmin(),
  listPendingVipRequests(),
  countPendingTestimonials(),
]);
```

**Inside the existing `<ul className="grid grid-cols-2 gap-3">`** — add a new tile after the `vip-requests` tile (around current line 98). Use the exact existing tile classes for visual consistency:

```tsx
<li>
  <Link
    href="/admin/testimonials"
    className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
  >
    <div className="font-display text-[16px] italic">{t("inbox_testimonials")}</div>
    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
      {pendingTestimonials} {t("inbox_pending_suffix")}
    </div>
  </Link>
</li>
```

- [ ] **Step 9.2: Lint**

```
npm run lint
```

- [ ] **Step 9.3: Commit**

```bash
git add app/[locale]/admin/page.tsx
git commit -m "feat(admin): Testimonials tile + pending count"
```

---

## Task 10: i18n keys

Per spec §10. One key on `Admin.*`, twelve on the new `AdminTestimonials.*` namespace. Add to en first, then mirror to ru and be.

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `messages/be.json`

- [ ] **Step 10.1: Add EN keys**

Inside the existing `"Admin": { ... }` object, add:

```jsonc
"inbox_testimonials": "Testimonials",
```

Append the new namespace object at the same depth as `Admin`, `AdminVipRequests`, etc.:

```jsonc
"AdminTestimonials": {
  "meta_title": "Testimonials",
  "eyebrow": "Moderation",
  "hero_title": "Pending reviews",
  "hero_paragraph": "Approve to publish on the master page and home. Reject to keep the submitter informed without going live.",
  "section_pending": "Pending ({n})",
  "section_approved": "Approved ({n})",
  "section_rejected": "Rejected ({n})",
  "empty_pending": "No pending reviews. New submissions land here.",
  "empty_approved": "Nothing approved yet.",
  "empty_rejected": "No rejected reviews.",
  "submitted_at": "Submitted",
  "decided_at": "Decided",
  "status_pending": "Pending",
  "status_approved": "Approved",
  "status_rejected": "Rejected",
  "cta_approve": "Approve",
  "cta_reject": "Reject"
}
```

- [ ] **Step 10.2: Add RU keys (translated)**

In `messages/ru.json`:

```jsonc
"inbox_testimonials": "Отзывы",
```

```jsonc
"AdminTestimonials": {
  "meta_title": "Отзывы",
  "eyebrow": "Модерация",
  "hero_title": "Отзывы на проверке",
  "hero_paragraph": "Одобрите, чтобы опубликовать на странице мастера и на главной. Отклоните, чтобы сообщить автору без публикации.",
  "section_pending": "На проверке ({n})",
  "section_approved": "Опубликованы ({n})",
  "section_rejected": "Отклонены ({n})",
  "empty_pending": "Новых отзывов нет. Новые поступления появятся здесь.",
  "empty_approved": "Пока ничего не опубликовано.",
  "empty_rejected": "Отклонённых отзывов нет.",
  "submitted_at": "Подан",
  "decided_at": "Решено",
  "status_pending": "На проверке",
  "status_approved": "Опубликован",
  "status_rejected": "Отклонён",
  "cta_approve": "Одобрить",
  "cta_reject": "Отклонить"
}
```

- [ ] **Step 10.3: Add BE keys (translated)**

In `messages/be.json`:

```jsonc
"inbox_testimonials": "Водгукі",
```

```jsonc
"AdminTestimonials": {
  "meta_title": "Водгукі",
  "eyebrow": "Мадэрацыя",
  "hero_title": "Водгукі на праверцы",
  "hero_paragraph": "Адобрыце, каб апублікаваць на старонцы майстра і на галоўнай. Адхіліце, каб паведаміць аўтару без публікацыі.",
  "section_pending": "На праверцы ({n})",
  "section_approved": "Апублікаваныя ({n})",
  "section_rejected": "Адхіленыя ({n})",
  "empty_pending": "Новых водгукаў няма. Новыя паступленні з'явяцца тут.",
  "empty_approved": "Пакуль нічога не апублікавана.",
  "empty_rejected": "Адхіленых водгукаў няма.",
  "submitted_at": "Пададзены",
  "decided_at": "Вырашана",
  "status_pending": "На праверцы",
  "status_approved": "Апублікаваны",
  "status_rejected": "Адхілены",
  "cta_approve": "Адобрыць",
  "cta_reject": "Адхіліць"
}
```

- [ ] **Step 10.4: Run lint + the view test from Task 7**

```
npm run lint
npx vitest run views/admin-testimonials/
```

Expected: lint clean, three tests passing.

- [ ] **Step 10.5: Commit**

```bash
git add messages/en.json messages/ru.json messages/be.json
git commit -m "i18n(admin-testimonials): EN/RU/BE moderation copy"
```

---

## Task 11: Master page — drop STUDIO_DATA fallback

Update `MasterPage` to take the new `ApprovedTestimonial[]` shape and hide the voices section when empty.

**Files:**
- Modify: `views/master/ui/master-page.tsx`

- [ ] **Step 11.1: Find the existing tests**

```
ls views/master/ui/
```

Note: PR #51 didn't add a master-page test. We'll add a minimal one inline with this change to lock the new behavior.

- [ ] **Step 11.2: Write the failing test**

Create `views/master/ui/master-page.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import { MasterPage } from "./master-page";
import type { ApprovedTestimonial } from "@/entities/testimonial";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("MasterPage voices section", () => {
  it("renders the voices section when testimonials are provided", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_1",
      body: "Magic hands.",
      createdAt: new Date(),
      authorDisplay: "Lara K.",
      authorPhotoUrl: null,
      masterId: "violetta",
    };
    renderWithIntl(<MasterPage testimonials={[tm]} />);
    expect(screen.getByText(/Magic hands/)).toBeInTheDocument();
    expect(screen.getByText("Lara K.")).toBeInTheDocument();
  });

  it("renders an <img> avatar when authorPhotoUrl is set", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_2",
      body: "Beautiful chrome finish.",
      createdAt: new Date(),
      authorDisplay: "Iris M.",
      authorPhotoUrl: "https://t.me/i/userpic/320/iris.jpg",
      masterId: "violetta",
    };
    renderWithIntl(<MasterPage testimonials={[tm]} />);
    const img = screen.getByAltText("Iris M.") as HTMLImageElement;
    expect(img.src).toContain("iris.jpg");
  });

  it("omits the voices section entirely when testimonials is empty", () => {
    renderWithIntl(<MasterPage testimonials={[]} />);
    // The voices eyebrow shouldn't render
    expect(screen.queryByText(/Voices/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 11.3: Run test, verify FAIL**

```
npx vitest run views/master/ui/master-page.test.tsx
```

Expected: TS errors (the prop type is currently `Testimonial[]` from `entities/studio`, not `ApprovedTestimonial[]`), plus the empty-array test failing because the current implementation maps `[]` and still emits the `<section>` with the eyebrow.

- [ ] **Step 11.4: Rewrite the file**

Edit `views/master/ui/master-page.tsx`:

**Imports — remove:**

```ts
import { STUDIO_DATA, type Testimonial } from "@/entities/studio";
```

**Imports — add:**

```ts
import type { ApprovedTestimonial } from "@/entities/testimonial";
```

**Prop type — change:**

```ts
export interface MasterPageProps {
  /** DB-backed master record. */
  master?: Master;
  /** Approved-and-published testimonials for this master. Section hides when empty. */
  testimonials?: readonly ApprovedTestimonial[];
}
```

**Default param — replace the `STUDIO_DATA.testimonials` fallback line:**

```ts
const testimonials = testimonialsProp ?? [];
```

**Voices section — wrap the entire `<section className="px-[22px] pb-7">…Voices…</section>` block in a conditional. The new section reads:**

```tsx
{testimonials.length > 0 ? (
  <section className="px-[22px] pb-7">
    <Eyebrow>{t("voices_eyebrow")}</Eyebrow>
    <div className="mt-4 flex flex-col gap-3.5">
      {testimonials.map((tm) => (
        <SpotlightCard key={tm.id} className="gilded glass-top rounded-[18px] p-[18px]">
          <p className="m-0 mb-3 font-display text-[18px] font-normal italic leading-[1.35]">
            &ldquo;{tm.body}&rdquo;
          </p>
          <LetterpressRule className="mb-3 max-w-[140px]" />
          <div className="flex items-center gap-2.5">
            {tm.authorPhotoUrl ? (
              <span className="relative size-[22px] overflow-hidden rounded-full">
                <Image
                  src={tm.authorPhotoUrl}
                  alt={tm.authorDisplay}
                  fill
                  sizes="22px"
                  unoptimized
                  className="object-cover"
                />
              </span>
            ) : (
              <span
                aria-hidden
                className="size-[22px] rounded-full"
                style={{
                  background:
                    "color-mix(in oklab, var(--color-rose) 60%, var(--color-accent))",
                }}
              />
            )}
            <div className="text-[12px]">
              <span className="font-medium">{tm.authorDisplay}</span>
            </div>
          </div>
        </SpotlightCard>
      ))}
    </div>
  </section>
) : null}
```

Note: drop the trailing `<span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">{tm.role}</span>` — there's no `role` on `ApprovedTestimonial`.

- [ ] **Step 11.5: Run test, verify PASS**

```
npx vitest run views/master/ui/master-page.test.tsx
```

- [ ] **Step 11.6: Commit**

```bash
git add views/master/ui/master-page.tsx views/master/ui/master-page.test.tsx
git commit -m "refactor(master): use ApprovedTestimonial[] and hide section when empty"
```

---

## Task 12: Master route loaders

Replace `loadTestimonialsWithPhotos()` calls with `listApprovedTestimonials({masterId})` in both routes.

**Files:**
- Modify: `app/[locale]/master/page.tsx`
- Modify: `app/[locale]/master/[slug]/page.tsx`

- [ ] **Step 12.1: Update `app/[locale]/master/page.tsx`**

**Imports — remove:**

```ts
import { loadTestimonialsWithPhotos } from "@/entities/studio/api/load-with-photos";
```

**Imports — add:**

```ts
import { listApprovedTestimonials } from "@/entities/testimonial";
```

**Inside the `if (masters.length === 1)` branch — replace the body:**

```ts
if (masters.length === 1) {
  const testimonials = await listApprovedTestimonials({
    masterId: masters[0].id,
    limit: 10,
  });
  return <MasterPage master={masters[0]} testimonials={testimonials} />;
}
```

Keep the `MastersListPage` branch unchanged.

- [ ] **Step 12.2: Update `app/[locale]/master/[slug]/page.tsx`**

Same swap pattern. Replace:

```ts
const testimonials = await loadTestimonialsWithPhotos();
```

with:

```ts
const testimonials = await listApprovedTestimonials({
  masterId: master.id,
  limit: 10,
});
```

And update the import.

- [ ] **Step 12.3: Lint**

```
npm run lint
```

- [ ] **Step 12.4: Commit**

```bash
git add app/[locale]/master/
git commit -m "feat(master): load real approved testimonials per master"
```

---

## Task 13: Home `<TestimonialCard>` — accept prop

Rewrite the section component to take an `ApprovedTestimonial | null` prop and return `null` when empty.

**Files:**
- Modify: `views/home/ui/sections/testimonial-card.tsx`
- Create: `views/home/ui/sections/testimonial-card.test.tsx` (none today)

- [ ] **Step 13.1: Write the failing test**

`views/home/ui/sections/testimonial-card.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import { TestimonialCard } from "./testimonial-card";
import type { ApprovedTestimonial } from "@/entities/testimonial";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TestimonialCard", () => {
  it("renders the body and author when a testimonial is provided", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_1",
      body: "Quiet, private, exquisite.",
      createdAt: new Date(),
      authorDisplay: "Iris M.",
      authorPhotoUrl: null,
      masterId: "violetta",
    };
    renderWithIntl(<TestimonialCard testimonial={tm} />);
    expect(screen.getByText(/Quiet, private, exquisite/)).toBeInTheDocument();
    expect(screen.getByText("Iris M.")).toBeInTheDocument();
  });

  it("renders an <img> avatar when authorPhotoUrl is set", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_2",
      body: "Magical experience.",
      createdAt: new Date(),
      authorDisplay: "Joelle P.",
      authorPhotoUrl: "https://t.me/i/userpic/320/joelle.jpg",
      masterId: "violetta",
    };
    renderWithIntl(<TestimonialCard testimonial={tm} />);
    const img = screen.getByAltText("Joelle P.") as HTMLImageElement;
    expect(img.src).toContain("joelle.jpg");
  });

  it("returns null when testimonial is null", () => {
    const { container } = renderWithIntl(
      <TestimonialCard testimonial={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 13.2: Run test, verify FAIL**

```
npx vitest run views/home/ui/sections/testimonial-card.test.tsx
```

- [ ] **Step 13.3: Rewrite the component**

`views/home/ui/sections/testimonial-card.tsx`:

```tsx
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ApprovedTestimonial } from "@/entities/testimonial";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";

export interface TestimonialCardProps {
  testimonial: ApprovedTestimonial | null;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const t = useTranslations("Home");
  if (!testimonial) return null;
  return (
    <section className="px-[22px] py-7">
      <Plate number={3} label={t("plate_word").toUpperCase()} />
      <div className="gilded glass-top relative mt-4 overflow-hidden rounded-[28px] px-7 py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 top-1.5 select-none font-display text-[140px] font-light italic leading-none text-gold"
        >
          &ldquo;
        </div>
        <p className="m-0 mb-5 pl-12 font-display text-[26px] font-normal italic leading-[1.3]">
          {testimonial.body}
        </p>
        <LetterpressRule className="mb-4 max-w-[200px]" />
        <div className="flex items-center gap-2.5">
          {testimonial.authorPhotoUrl ? (
            <span className="relative size-7 overflow-hidden rounded-full border-[0.5px] border-accent">
              <Image
                src={testimonial.authorPhotoUrl}
                alt={testimonial.authorDisplay}
                fill
                sizes="28px"
                unoptimized
                className="object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden
              className="size-7 rounded-full border-[0.5px] border-accent"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, var(--color-rose), var(--color-plum))",
              }}
            />
          )}
          <div>
            <div className="text-[13px] font-medium">{testimonial.authorDisplay}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 13.4: Run test, verify PASS**

```
npx vitest run views/home/ui/sections/testimonial-card.test.tsx
```

- [ ] **Step 13.5: Commit**

```bash
git add views/home/ui/sections/testimonial-card.tsx views/home/ui/sections/testimonial-card.test.tsx
git commit -m "refactor(home/testimonial-card): accept prop and hide when null"
```

---

## Task 14: Home page + route — thread the latest approved testimonial

**Files:**
- Modify: `views/home/ui/home-page.tsx`
- Modify: `app/[locale]/home/page.tsx`

- [ ] **Step 14.1: Update `views/home/ui/home-page.tsx`**

**Imports — add:**

```ts
import type { ApprovedTestimonial } from "@/entities/testimonial";
```

**Props type — extend:**

```ts
export interface HomePageProps {
  master?: Master;
  settings: SiteSettings;
  locale: Locale;
  testimonial: ApprovedTestimonial | null;
}
```

**Function signature — destructure + pass through:**

```tsx
export function HomePage({
  master,
  settings,
  locale,
  testimonial,
}: HomePageProps) {
  return (
    <div className="pb-28">
      …existing sections…
      <AtelierMotion />
      <TestimonialCard testimonial={testimonial} />
      <MembershipCard />
      <HomeFooter settings={settings} locale={locale} />
      <TabBar />
    </div>
  );
}
```

- [ ] **Step 14.2: Update `app/[locale]/home/page.tsx`**

Extend the `Promise.all` to load the latest approved testimonial:

```ts
import { listApprovedTestimonials } from "@/entities/testimonial";

// inside HomeRoute:
const [masters, settings, latestTestimonials] = await Promise.all([
  loadMastersForLocale(locale as Locale, { publishedOnly: true }),
  getSiteSettingsServer(),
  listApprovedTestimonials({ limit: 1 }),
]);
const testimonial = latestTestimonials[0] ?? null;
return (
  <HomePage
    master={masters[0]}
    settings={settings}
    locale={locale as Locale}
    testimonial={testimonial}
  />
);
```

- [ ] **Step 14.3: Lint**

```
npm run lint
```

- [ ] **Step 14.4: Commit**

```bash
git add views/home/ui/home-page.tsx app/[locale]/home/page.tsx
git commit -m "feat(home): pass latest approved testimonial through the route"
```

---

## Task 15: Cleanup — delete STUDIO_DATA.testimonials + Testimonial type + loader

After Tasks 11–14, no caller references the old type or the photo loader. Now delete them.

**Files:**
- Modify: `entities/studio/api/load-with-photos.ts` (delete the function)
- Modify: `entities/studio/model/data.ts` (delete the array + the export field)
- Modify: `entities/studio/model/types.ts` (delete the `Testimonial` interface)
- Modify: `entities/studio/index.ts` (drop the re-export if present)

- [ ] **Step 15.1: Sweep grep — confirm no remaining callers**

```
grep -rn "STUDIO_DATA.testimonials" --include="*.ts" --include="*.tsx" .
grep -rn "loadTestimonialsWithPhotos" --include="*.ts" --include="*.tsx" .
grep -rn "from \"@/entities/studio\".*Testimonial" --include="*.ts" --include="*.tsx" .
```

Expected output for the first two: zero (or only `features/photo-upload-admin/model/slot.ts` for the first, which is handled in Task 16). For the third: zero.

If anything else turns up, fix it first.

- [ ] **Step 15.2: Delete from `entities/studio/model/data.ts`**

- Remove the `Testimonial` from the `import` at the top.
- Remove the local `const testimonials: Testimonial[] = [...]` array.
- Remove `testimonials` from the `export const STUDIO_DATA = { ... } as const;` object.

- [ ] **Step 15.3: Delete from `entities/studio/model/types.ts`**

- Remove the entire `export interface Testimonial { ... }` block.

- [ ] **Step 15.4: Update `entities/studio/index.ts`**

Inspect the file. If `Testimonial` is re-exported as a type, remove it. Otherwise leave alone.

- [ ] **Step 15.5: Delete the function from `entities/studio/api/load-with-photos.ts`**

Remove the entire `export async function loadTestimonialsWithPhotos(...) { ... }` block plus its leading JSDoc comment.

- [ ] **Step 15.6: Run lint to catch any stale references**

```
npm run lint
```

Expected: clean.

- [ ] **Step 15.7: Run the full test suite**

```
npm test
```

Expected: all green (or skipped) — no test should have depended on `STUDIO_DATA.testimonials`.

- [ ] **Step 15.8: Commit**

```bash
git add entities/studio/
git commit -m "refactor(entities/studio): drop mock testimonials data + loader + type"
```

---

## Task 16: Cleanup — photo-upload-admin testimonial slot loop

The admin uploader's slot list pulled in testimonial photo slots from `STUDIO_DATA.testimonials.id`. Those IDs no longer exist. Drop the loop and any test/story fixtures that referenced testimonial slots.

**Files:**
- Modify: `features/photo-upload-admin/model/slot.ts`
- Modify: `features/photo-upload-admin/model/slot.test.ts` (if exists)
- Modify: any `features/photo-upload-admin/**/*.stories.tsx` referencing testimonial slots

- [ ] **Step 16.1: Sweep**

```
grep -rn "slot_kind.*testimonial\|kind: \"testimonial\"\|kind:\"testimonial\"" features/photo-upload-admin/ views/admin-photos/ 2>/dev/null
```

This shows exactly which files need touching.

- [ ] **Step 16.2: Edit `features/photo-upload-admin/model/slot.ts`**

Remove this loop entirely (current lines 43-50):

```ts
for (const t of STUDIO_DATA.testimonials) {
  slots.push({
    kind: "testimonial",
    id: t.id,
    label: `${t.name} · ${t.role}`,
    hint: "1:1 · 22px disc",
  });
}
```

Drop the `STUDIO_DATA` import if no other usage remains in the file (keep `STUDIO_DATA.gallery` / `STUDIO_DATA.atelierClips` / `STUDIO_DATA.profile` references — those still exist).

- [ ] **Step 16.3: Update tests/stories from §16.1 results**

If a test fixture or story referenced a `testimonial` slot, drop those entries. Don't add new ones.

- [ ] **Step 16.4: Run lint + full test**

```
npm run lint
npm test
```

Expected: green.

- [ ] **Step 16.5: Commit**

```bash
git add features/photo-upload-admin/
git commit -m "refactor(photo-upload-admin): drop testimonial slot loop"
```

---

## Task 17: E2E test

Asserts `/en/admin/testimonials` renders and that the new tile on `/en/admin` links to it. Auth-skip posture matches other admin specs.

**Files:**
- Create: `e2e/admin-testimonials.spec.ts`

- [ ] **Step 17.1: Write the spec**

`e2e/admin-testimonials.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

// Same posture as e2e/admin-services.spec.ts: when TELEGRAM_BOT_TOKEN
// is unset the admin routes are open and these specs run; once the
// token lands they redirect to /sign-in and we'd need an admin fixture
// (not wired yet).
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin testimonials page renders all three buckets", async ({ page }) => {
  await page.goto("/en/admin/testimonials");
  await expect(
    page.getByRole("heading", { level: 1, name: /Pending reviews/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Pending \(\d+\)$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Approved \(\d+\)$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Rejected \(\d+\)$/ })).toBeVisible();
});

test("admin dashboard exposes the Testimonials tile", async ({ page }) => {
  await page.goto("/en/admin");
  const tile = page.getByRole("link", { name: /Testimonials/i });
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page).toHaveURL(/\/en\/admin\/testimonials$/);
});
```

- [ ] **Step 17.2: Sanity-run the spec locally (optional — full run is in Task 18)**

```
npx playwright test e2e/admin-testimonials.spec.ts
```

If the dev server isn't running on 3100 Playwright will start it. Stop any local `next dev` first ([CLAUDE.md](CLAUDE.md) commands section).

- [ ] **Step 17.3: Commit**

```bash
git add e2e/admin-testimonials.spec.ts
git commit -m "test(e2e): admin testimonials page + dashboard tile navigation"
```

---

## Task 18: Verification + branch finish

Full pipeline check before opening the PR.

- [ ] **Step 18.1: Lint**

```
npm run lint
```

Expected: clean.

- [ ] **Step 18.2: Unit + storybook tests**

```
npm test
```

Expected: existing 580 + new tests added in this PR (build-author-display 6, db 3, load-approved 1, actions 6, decision-actions 3, testimonial-row 4, admin-testimonials view 3, master-page 3, testimonial-card 3 ≈ 32 new), all passing.

- [ ] **Step 18.3: Build**

```
npm run build
```

Expected: zero errors. The build is the only check that catches `params`/`searchParams` and server-component / use-client mismatches.

- [ ] **Step 18.4: E2E**

```
npm run e2e
```

Expected: existing suite + the two new admin-testimonials cases pass.

- [ ] **Step 18.5: Push and open PR**

```
git push -u origin feature/admin-testimonial-moderation
gh pr create --base develop --title "feat: admin testimonial moderation + real reviews on public pages" --body "$(cat <<'EOF'
## Summary
- Admin can approve/reject user-submitted testimonials at /admin/testimonials with a three-bucket UI (pending / approved / rejected) and a pending-count tile on /admin
- Master detail page voices section and home TestimonialCard now load real approved testimonials from the DB — sections hide entirely when no approved rows exist
- Removes the hardcoded STUDIO_DATA.testimonials array, the loadTestimonialsWithPhotos loader, and the testimonial photo-upload slot loop

## Test plan
- [ ] /admin shows the new Testimonials tile with a live pending count
- [ ] /admin/testimonials renders three sections; pending rows show Approve + Reject; approved/rejected rows are read-only
- [ ] Approving a pending row moves it to Approved and surfaces it on the master page voices section
- [ ] Rejecting a pending row moves it to Rejected and hides it from the public site
- [ ] Submitting a testimonial twice for the same master is blocked by the existing partial unique index
- [ ] Home TestimonialCard shows the latest approved testimonial, or no section when DB has none
- [ ] Master detail page hides its voices section when no approved testimonials exist for that master

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 18.6: Report the PR URL back**

Done.

---

## Notes for the implementer

- **Don't refactor anything not on the file map.** No drive-by cleanup. If something looks wrong, leave it and surface it in your status report.
- **Each task must end with a commit.** Husky pre-commit runs lint + test. If they fail, fix them in the same task; don't accumulate broken state.
- **Test running:** prefer `npx vitest run <path>` over `npm test` during inner loops — it's ~10× faster. Save `npm test` for the verification task.
- **i18n note:** the view tests at Task 7 import `messages/en.json` directly. The keys must exist by the time those tests run. The plan resolves this by jumping to Task 10 mid-Task 7; alternatively, write Task 10's keys first, then Task 7. Don't try to mock the next-intl provider — the codebase doesn't do that anywhere else.
- **`AdminTestimonialRow.masterName{En,Ru,Be}` defaults to `""`** because the join is a `leftJoin`. The FK is NOT NULL so in practice these are always strings, but TS infers `string | null` from the join. The map coerces with `?? ""`. Don't drop the coercion.
- **`<Image unoptimized>` on `authorPhotoUrl`** sidesteps the Next image proxy and `remotePatterns` config — Telegram CDN URLs come back from Auth.js sign-in.
- **No DB migration needed.** Schema is already in place from PR #51 (migration 0012).
- **The `loadTestimonialsWithPhotos` deletion (Task 15) MUST come after Tasks 11–14**, otherwise the master/home routes will fail to import. Don't shuffle the order.
