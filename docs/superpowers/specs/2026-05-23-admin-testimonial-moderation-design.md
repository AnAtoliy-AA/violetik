# Admin Testimonial Moderation + Real Reviews — Design

**Author:** Anatoliy
**Date:** 2026-05-23
**Status:** Approved
**Branch:** `feature/admin-testimonial-moderation` (off `develop`)

---

## 1. Goal

1. Give the admin a way to **approve or reject** the user-submitted testimonials that already land in the `testimonials` table (PR #51 wired the submit flow but nothing decides them).
2. Replace every customer-facing usage of the hardcoded `STUDIO_DATA.testimonials` array with **real, approved** rows. Empty database → empty section, not mock copy.

These two pieces ship together because the public surfaces (`/master/[slug]` voices, home `TestimonialCard`) cannot honestly switch to "real reviews" until there is a way to approve them.

## 2. Non-Goals

- Editing a testimonial body after submission (no admin or user edit).
- Hard-delete from the DB. Reject is a soft state (`status = 'rejected'`); rejected rows stay for audit + so the submitter sees the verdict.
- Bulk moderation, search, filtering, pagination.
- Reordering / "featuring" approved testimonials. Display order is `created_at DESC` everywhere.
- Replying to testimonials (no two-way thread).
- Email or Telegram notifications to the submitter on decision.
- Author "role" lines (the mock had `"Member · 3y"` — there is no equivalent for real users in v1 without leaking VIP tier into a public surface; out of scope).
- Migrating existing demo testimonials into the DB. Only real submissions appear post-merge.

## 3. Storage

The `testimonials` table and `testimonial_status` enum already exist (migration `0012_right_lyja.sql`):

```text
testimonials(id, user_id FK→users, master_id FK→masters, body, status, decided_at, decided_by FK→users, created_at, updated_at)
```

Statuses: `pending`, `approved`, `rejected`. Partial unique index `testimonials_one_pending_per_pair` already prevents a user from queuing two pending reviews for the same master.

Both FKs use `onDelete: cascade`. So:
- Deleting a user (rare admin action — currently no UI for it) wipes their testimonials.
- Deleting a master (also admin-only, currently no UI) wipes the master's testimonials.
- **Archiving** a master (`status = 'archived'`) keeps the testimonials intact. The master detail route already 404s on non-published masters (`app/[locale]/master/[slug]/page.tsx:31`), so an archived master's testimonials become unreachable through the public surface — but they remain queryable by the new admin moderation page (which doesn't filter by master status). That's deliberate: the admin needs to see the row to reject/audit it; the public flow can't reach it.

**No schema changes.** All work in this spec uses the existing columns + indexes.

## 4. Module Layout (FSD)

```
db/
  testimonials.ts                              # extend: AdminTestimonialRow, listTestimonialsByStatus,
                                               #         decideTestimonial, countPendingTestimonials
features/
  testimonials-admin/                          # NEW slice (mirrors vip-requests-admin)
    api/
      actions.ts                               # approveTestimonial, rejectTestimonial
      actions.test.ts
    ui/
      decision-actions.tsx                     # approve/reject buttons (client)
      decision-actions.stories.tsx
      decision-actions.test.tsx
      testimonial-row.tsx                      # one-row presentation (server component)
      testimonial-row.stories.tsx
      testimonial-row.test.tsx
    index.ts
entities/
  testimonial/                                 # NEW slice — locale-aware loader
    api/
      load-approved.ts                         # listApprovedTestimonials({masterId?, limit?})
      load-approved.test.ts
    lib/
      build-author-display.ts                  # shared with features/testimonials-admin
      build-author-display.test.ts
    model/
      types.ts                                 # ApprovedTestimonial
    index.ts
views/
  admin-testimonials/                          # NEW
    ui/
      admin-testimonials-page.tsx              # composes sections from pre-loaded props
      admin-testimonials-page.test.tsx
    index.ts
app/[locale]/admin/
  page.tsx                                     # MODIFY: add Testimonials tile + pending count
  testimonials/page.tsx                        # NEW: route file (auth gate + DB reads + render view)
views/master/ui/master-page.tsx                # MODIFY: drop STUDIO_DATA fallback, use ApprovedTestimonial[]
app/[locale]/master/page.tsx                   # MODIFY: replace loadTestimonialsWithPhotos (inside masters.length===1 branch)
app/[locale]/master/[slug]/page.tsx            # MODIFY: call listApprovedTestimonials({masterId})
views/home/ui/sections/testimonial-card.tsx    # MODIFY: accept prop, return null when null
views/home/ui/home-page.tsx                    # MODIFY: thread the testimonial prop in
app/[locale]/home/page.tsx                     # MODIFY: load the latest approved
entities/studio/api/load-with-photos.ts        # DELETE loadTestimonialsWithPhotos
entities/studio/model/data.ts                  # DELETE testimonials[] + export shape
entities/studio/model/types.ts                 # DELETE Testimonial interface
entities/studio/index.ts                       # MODIFY: drop Testimonial re-export
features/photo-upload-admin/model/slot.ts      # MODIFY: drop testimonial slot loop
features/photo-upload-admin/**/*.{test,stories}.* # MODIFY: prune any testimonial-slot fixtures
messages/{en,ru,be}.json                       # MODIFY: add Admin.inbox_testimonials + AdminTestimonials.* namespace
e2e/admin-testimonials.spec.ts                 # NEW
```

The slice boundaries match the existing project shape:

- `db/testimonials.ts` is the only place that talks Drizzle for this table.
- `entities/testimonial/` exposes a single **read** loader for the public surfaces; admin reads stay in `db/testimonials.ts` directly (mirrors how `bookings-admin` reads through `db/bookings.ts` without going through an entity slice).
- `features/testimonials-admin/` owns the admin write actions + admin row UI.
- `views/admin-testimonials/` composes the admin page.

## 5. DB Layer — additions to [db/testimonials.ts](db/testimonials.ts)

### 5.1 `listTestimonialsByStatus(status)`

Joins users + masters so the admin UI gets author + master display strings without N+1 lookups.

```ts
export interface AdminTestimonialRow {
  id: string;
  body: string;
  status: TestimonialStatus;
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
  status: TestimonialStatus,
): Promise<AdminTestimonialRow[]>;
```

Order:
- `pending` and `rejected` → `created_at DESC` (newest submissions first / newest rejections first).
- `approved` → `decided_at DESC` (most recently approved first).

Returns `[]` if `db` is null or the table is missing (same `isMissingTable` walker used elsewhere in the file).

### 5.2 `decideTestimonial({id, action, decidedBy})`

```ts
export type DecideTestimonialInput =
  | { id: string; action: "approve"; decidedBy: string }
  | { id: string; action: "reject"; decidedBy: string };

export async function decideTestimonial(
  input: DecideTestimonialInput,
): Promise<schema.Testimonial | null>;
```

Single conditional UPDATE:

```sql
UPDATE testimonials
SET status = $next, decided_at = now(), decided_by = $admin, updated_at = now()
WHERE id = $id AND status = 'pending'
RETURNING *
```

Race-safe: a second admin clicking on the same row gets `null` back (their UPDATE matches zero rows). The caller maps `null` → `{ ok: false, reason: "not-found" }` — same posture as `decideVipRequest`.

### 5.3 `countPendingTestimonials()`

```ts
export async function countPendingTestimonials(): Promise<number>;
```

Used by the admin dashboard tile. Returns `0` if the DB or table is unreachable.

## 6. Entity Layer — `entities/testimonial/`

### 6.1 `ApprovedTestimonial`

```ts
export interface ApprovedTestimonial {
  id: string;
  body: string;
  createdAt: Date;
  authorDisplay: string;     // "Lara K." / "Lara" / "lara_k" / "ali***@…" / "Guest"
  authorPhotoUrl: string | null;
  masterId: string;
}
```

The public-facing entity is intentionally narrow: the master page already knows the master (it's the route's `master` prop), and the home card doesn't display the master name at all. The trilingual master name lives on `AdminTestimonialRow` (§5.1) where it's actually used.

### 6.2 `listApprovedTestimonials({masterId?, limit?})`

```ts
export interface ListApprovedTestimonialsOptions {
  masterId?: string;
  limit?: number;          // default 20
}

export async function listApprovedTestimonials(
  options?: ListApprovedTestimonialsOptions,
): Promise<ApprovedTestimonial[]>;
```

- `WHERE status = 'approved'` plus optional `AND master_id = $masterId`
- `ORDER BY decided_at DESC` (most recently approved surfaces first)
- `LIMIT $limit` (caller passes `1` on home, `10` on master page)
- Joins `users` for the author display fields. No `masters` join — the entity shape doesn't carry master names (the caller already has the master loaded, or the home card doesn't display a master name).
- `authorDisplay` is computed in JS, not SQL — extracted as a shared helper `entities/testimonial/lib/build-author-display.ts` so both the public loader (§6.2) and the admin row UI (§8.2) can call it:
  ```ts
  function buildAuthorDisplay(u: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string | null;
  }): string {
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
  Returning a truncated email head (e.g. `"al…"`) before "Guest" gives a usable label for Google-sign-in users who never set a Telegram username or first name, while still keeping the address itself private. "Guest" is a defensive fallback only — `testimonials.user_id` is NOT NULL, so the `User` row is guaranteed to exist, but every text column on it is nullable in the schema.

  Pure function — unit-tested separately so the loader test can stay an integration test.

Returns `[]` when DB is null or table is missing. The new loader duplicates the six-line `isMissingTable` walker that already lives privately in `db/testimonials.ts`, `db/masters.ts`, `db/services.ts`, and others — promoting it to a shared `db/lib/` module is out of scope for this PR (would touch six unrelated files for a marginal benefit). The duplication is intentional and matches the existing repo pattern; cleanup is a separate refactor task.

## 7. Server Actions — `features/testimonials-admin/api/actions.ts`

Mirrors `features/vip-requests-admin/api/actions.ts` byte-for-byte where shapes match.

```ts
"use server";

export type AdminTestimonialActionResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "forbidden" | "not-found" };

export async function approveTestimonial(id: string): Promise<AdminTestimonialActionResult>;
export async function rejectTestimonial(id: string): Promise<AdminTestimonialActionResult>;
```

Both:

1. `requireAdmin()` — propagates `unauthorized` / `forbidden`.
2. `decideTestimonial({ id, action, decidedBy: gate.user.id })`.
3. `null` → `{ok:false,reason:"not-found"}` (already decided or doesn't exist).
4. `revalidatePath("/", "layout")` — the master + home + admin pages all need to refresh.
5. Return `{ok:true,id:row.id}`.

No input validation needed — the only parameter is an id; the WHERE clause is the validation.

## 8. UI Components

### 8.1 `<DecisionActions>` — `features/testimonials-admin/ui/decision-actions.tsx`

`"use client"` with `useTransition`. Two `<form action>` elements, Approve (solid) + Reject (outline), matches the visual rhythm of `RequestActions` in vip-requests-admin. Props:

```ts
interface DecisionActionsProps {
  testimonialId: string;
  approveLabel: string;
  rejectLabel: string;
}
```

Disabled while the transition is pending. No optimistic update — the `revalidatePath` re-render is the source of truth.

### 8.2 `<TestimonialRow>` — `features/testimonials-admin/ui/testimonial-row.tsx`

Presentation-only **server component** (no `"use client"`). It receives `Date` objects directly, which is fine on the server — only the `<DecisionActions>` slot is a client component, and it gets pre-formatted string props. Receives:

```ts
interface TestimonialRowProps {
  row: AdminTestimonialRow;
  locale: Locale;
  decisionSlot?: ReactNode;   // <DecisionActions> for pending; omitted for approved/rejected
  labels: {
    submittedAt: string;
    decidedAt: string;
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
  };
}
```

Renders the body, the master's locale-resolved name, the author display (computed via the shared `buildAuthorDisplay` helper using `row.authorFirstName/LastName/Username/Email`), submitted-at timestamp, status badge, and the slot. Avatar disc uses `row.authorPhotoUrl` when present, gradient fallback otherwise.

### 8.3 `<AdminTestimonialsPage>` — `views/admin-testimonials/ui/admin-testimonials-page.tsx`

To keep the view testable, the page is split into:

- **Route file** `app/[locale]/admin/testimonials/page.tsx` — does the auth gate, the DB reads, and renders `<AdminTestimonialsPage>` with pre-loaded arrays.
- **View** `views/admin-testimonials/ui/admin-testimonials-page.tsx` — receives `{ locale, pending, approved, rejected }` as props and composes the sections. Testable without DB.

The route file follows the **vip-requests precedent** ([app/[locale]/admin/vip-requests/page.tsx:60-61](app/[locale]/admin/vip-requests/page.tsx#L60-L61)) — **unconditional `requireAdmin()`**, not the env-gated `AUTH_REQUIRED` posture of the admin dashboard root:

```ts
const gate = await requireAdmin();
if (!gate.ok) redirect({ href: "/sign-in", locale });
```

Every existing admin sub-page redirects unauthenticated visitors regardless of `TELEGRAM_BOT_TOKEN`; only the `/admin` root is permissive in dev/CI so the dashboard renders for route-level tests. Following the precedent keeps the moderation queue gated the same way as VIP requests, bookings, and site-settings.

The view's three sections (matches `/admin/vip-requests` rhythm):

- **Pending** — `<TestimonialRow>` with `<DecisionActions>` slot. Section heading: `t("section_pending", { n: pending.length })` → `"Pending (3)"`. Empty state: `t("empty_pending")`.
- **Approved** — `<TestimonialRow>` without slot. Heading: `t("section_approved", { n: approved.length })`. Empty state: `t("empty_approved")`.
- **Rejected** — `<TestimonialRow>` without slot, dimmed (`opacity-60`). Heading: `t("section_rejected", { n: rejected.length })`. Empty state: `t("empty_rejected")`.

The route file is `dynamic = "force-dynamic"` (same as `vip-requests/page.tsx:19`).

### 8.4 Admin dashboard tile

In [app/[locale]/admin/page.tsx](app/[locale]/admin/page.tsx), add a new `<li>` inside the existing `<ul className="grid grid-cols-2 gap-3">` (currently seven tiles). Wire `countPendingTestimonials()` into the existing `Promise.all([listBookingsForAdmin(), listPendingVipRequests()])` block. The tile uses the same shape as the bookings/vip tiles ([app/[locale]/admin/page.tsx:83-86, 93-96](app/[locale]/admin/page.tsx#L83-L96)):

```tsx
<li>
  <Link href="/admin/testimonials" className="gilded block rounded-[18px] p-5 …">
    <div className="font-display text-[16px] italic">{t("inbox_testimonials")}</div>
    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
      {pendingTestimonials} {t("inbox_pending_suffix")}
    </div>
  </Link>
</li>
```

Only one new key on `Admin.*`: `inbox_testimonials = "Testimonials"`. Reuses the existing `inbox_pending_suffix = "pending"`.

## 9. Public Surfaces — wiring in approved reviews

### 9.1 Master page

[views/master/ui/master-page.tsx](views/master/ui/master-page.tsx):

- Drop the `STUDIO_DATA.testimonials` import + the `?? STUDIO_DATA.testimonials` fallback.
- `testimonials` prop becomes `readonly ApprovedTestimonial[]` (was `readonly Testimonial[]` from `entities/studio`).
- The voices section renders **only when the array is non-empty** (`testimonials.length > 0`). When empty, the entire `<section>...Voices...</section>` block (currently [views/master/ui/master-page.tsx:173-215](views/master/ui/master-page.tsx#L173-L215)) is dropped from the DOM — the master page flows from the stats → CTA without a hole. The CTA section (currently directly below voices) already has its own vertical padding so there's no visual gap to patch.
- Author display: `tm.authorDisplay`. Avatar: `tm.authorPhotoUrl` when present, gradient fallback otherwise (same conditional `<Image>` vs gradient pattern that already exists in the file).
- The mock `role` line is removed from the testimonial card (no `tm.role` anymore — drop the `<span className="font-mono ...">`).

**Deploy-day visual impact (call out for §13):** the moment this PR ships, every published master page **loses its voices section** until at least one approved testimonial per master lands. There is no mock fallback. This is intentional — the alternative is showing fake reviews — but it is visible to anyone landing on a master detail page in the gap between merge and first approval.

Callers:

- **[app/[locale]/master/page.tsx](app/[locale]/master/page.tsx)** — the call stays inside the `if (masters.length === 1)` branch ([app/[locale]/master/page.tsx:31-34](app/[locale]/master/page.tsx#L31-L34)). The `else` branch renders `MastersListPage`, which doesn't take a `testimonials` prop. Replace the `loadTestimonialsWithPhotos()` call (line 32) with `listApprovedTestimonials({ masterId: masters[0].id, limit: 10 })`. Do not hoist the load before the branch.
- **[app/[locale]/master/[slug]/page.tsx](app/[locale]/master/[slug]/page.tsx)** — single-master route. Replace `loadTestimonialsWithPhotos()` with `listApprovedTestimonials({ masterId: master.id, limit: 10 })`. The existing `notFound()` gate on non-published masters means the route can't reach this call for an archived master.

The `loadTestimonialsWithPhotos` function is deleted — user testimonials use `user.photoUrl`, not the `studio_photos` table.

### 9.2 Home page

[views/home/ui/sections/testimonial-card.tsx](views/home/ui/sections/testimonial-card.tsx):

```ts
export interface TestimonialCardProps {
  testimonial: ApprovedTestimonial | null;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  if (!testimonial) return null;
  // ... existing visual layout, swapping item.text/name/role
  //     for testimonial.body/authorDisplay (no role line)
}
```

The locale-resolved master name isn't displayed on the home card today — the mock just shows author + role. Real version shows `authorDisplay` and drops the role line. The card looks the same; it just sources real data.

[views/home/ui/home-page.tsx](views/home/ui/home-page.tsx) gains a `testimonial?: ApprovedTestimonial | null` prop and passes it through. The route file at `app/[locale]/home/page.tsx` loads `await listApprovedTestimonials({ limit: 1 })` and passes `result[0] ?? null`.

When the DB has no approved testimonials, the section is omitted entirely — the home flow goes AtelierMotion → MembershipCard without a gap.

### 9.3 Cleanup

- **Delete** `loadTestimonialsWithPhotos` from [entities/studio/api/load-with-photos.ts](entities/studio/api/load-with-photos.ts) (after rewiring the two master callers in §9.1 — verify no remaining imports).
- **Delete** the `testimonials: Testimonial[]` field from the exported `STUDIO_DATA` object in [entities/studio/model/data.ts](entities/studio/model/data.ts), along with the local `testimonials` array, the `Testimonial` import, and the `Testimonial` type import.
- **Delete** the `Testimonial` interface from [entities/studio/model/types.ts](entities/studio/model/types.ts).
- **Update** [entities/studio/index.ts](entities/studio/index.ts) to drop the `Testimonial` re-export.
- **Delete** the `for (const t of STUDIO_DATA.testimonials) { … push({ kind: "testimonial", … }) }` block at [features/photo-upload-admin/model/slot.ts:43-50](features/photo-upload-admin/model/slot.ts#L43). The `photoSlotKind` enum keeps `testimonial` as a value (no migration churn); admins will simply never see a testimonial slot in the picker. Any historical `studio_photos` rows with `slot_kind='testimonial'` remain in the DB unused — harmless.

**Sweep step:** after the deletes, grep for `STUDIO_DATA.testimonials`, `from "@/entities/studio".*Testimonial`, and `slot_kind.*testimonial` across the repo. Expected post-PR result: zero hits for the first two; the third should only appear in `db/schema.ts`, `db/migrations/`, and any historical migration tests. Fixtures, stories, or tests that referenced testimonial photo slots need pruning too — `features/photo-upload-admin/**/*.test.*` and `**/*.stories.tsx` are the likely sites. The implementation plan must include this sweep as an explicit step, not an afterthought.

## 10. i18n

New keys per locale (en values shown; ru/be translations follow the voice already established in PR #51's `Profile.testimonial_*` keys):

```jsonc
// Admin.* — one new key, reuses existing "inbox_pending_suffix"
"inbox_testimonials": "Testimonials",

// AdminTestimonials.*  (new namespace)
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
```

`section_*` keys mirror the `AdminVipRequests.section_*` pattern at [app/[locale]/admin/vip-requests/page.tsx:87, 115, 143](app/[locale]/admin/vip-requests/page.tsx#L87) — counts inline in the heading so admins see the queue depth at a glance. `cta_*` and `empty_*` prefixes also mirror the AdminVipRequests namespace for consistency. Existing `Profile.status_*` keys stay; the admin set is a separate namespace so moderation wording (verb vs adjective) can diverge from the customer-facing badges without churn.

## 11. Tests

### 11.1 DB layer (`db/testimonials.test.ts` — extend)

`it.skipIf(!process.env.DATABASE_URL)` for all integration tests, same shape as the existing `createTestimonial` tests:

- `listTestimonialsByStatus("pending")` returns the rows we seeded with `status='pending'`, joined fields populated, ordered `created_at DESC`.
- `listTestimonialsByStatus("approved")` ordered by `decided_at DESC`.
- `listTestimonialsByStatus("rejected")` ordered by `created_at DESC`.
- `decideTestimonial({action:"approve"})` flips a pending row, sets `decided_at`/`decided_by`, returns the row.
- `decideTestimonial({action:"approve"})` on an already-approved row returns `null` (status guard).
- `decideTestimonial({action:"reject"})` flips a pending row to rejected.
- `countPendingTestimonials()` counts only pending.

### 11.2 Entity loader (`entities/testimonial/api/load-approved.test.ts`)

- `listApprovedTestimonials()` filters by approved status only.
- `listApprovedTestimonials({masterId})` filters to a single master.
- `listApprovedTestimonials({limit:1})` respects the cap.

### 11.2.1 Author-display helper (`entities/testimonial/lib/build-author-display.test.ts`)

- firstName + lastName → `"Lara K."`
- firstName only → `"Lara"`
- username only → `"lara_k"`
- email only → first two chars + ellipsis (`"al…"`)
- email shorter than two chars → returned as-is
- all null → `"Guest"`

### 11.3 Server actions (`features/testimonials-admin/api/actions.test.ts`)

Mirrors `features/vip-requests-admin/api/actions.test.ts`. Mocks `requireAdmin`, mocks `decideTestimonial`, asserts return shapes for:
- `unauthorized` (no session)
- `forbidden` (non-admin)
- `not-found` (decideTestimonial returns null)
- `ok` (calls revalidatePath, returns id)

### 11.4 UI (`features/testimonials-admin/ui/*.test.tsx`, `views/admin-testimonials/ui/*.test.tsx`)

- `<DecisionActions>` — clicking Approve calls `approveTestimonial(id)`; clicking Reject calls `rejectTestimonial(id)`; both buttons disable during transition.
- `<TestimonialRow>` — renders body + author + master name; selects the locale-correct name from `masterNameEn|Ru|Be`; shows decision slot only when provided.
- `<AdminTestimonialsPage>` (the view, not the route) — receives the three arrays as props and composes the sections. Tests assert: section headings carry counts, empty-state copy appears when an array is empty, decision slot is wired only for the pending bucket. The view is a pure server component taking pre-loaded props, so no DB mocking is needed.

### 11.5 Storybook

Stories for `<DecisionActions>` (pending state, transition state) and `<TestimonialRow>` (pending / approved / rejected variants). They auto-run as vitest tests via the storybook project.

### 11.6 E2E (`e2e/admin-testimonials.spec.ts`)

Same `test.skip(Boolean(process.env.TELEGRAM_BOT_TOKEN), ...)` posture as `e2e/admin-services.spec.ts`. Covers:

- `/en/admin/testimonials` renders Pending/Approved/Rejected headings.
- Admin dashboard root has the new `Testimonials` tile linking to `/en/admin/testimonials`.

Decision-button click behavior is unit-covered; e2e stays on render + navigation.

## 12. Migration

No DB migration. The PR adds code only:

- New module files under `features/testimonials-admin/`, `entities/testimonial/`, `views/admin-testimonials/`, `app/[locale]/admin/testimonials/`.
- Deletes `loadTestimonialsWithPhotos` + the `STUDIO_DATA.testimonials` array + the `Testimonial` type + the testimonial photo-slot loop.
- Adds i18n keys (one on `Admin.*`, twelve on the new `AdminTestimonials.*` namespace, per locale).

On deploy:

1. `npm run build` passes — no schema changes.
2. The admin dashboard immediately shows the new "Testimonials" tile (count `0` while the DB has no pending rows).
3. **Customer-facing voices/home testimonial sections disappear from the live site** until an admin approves the first review per surface. The home `TestimonialCard` disappears entirely until at least one testimonial is approved anywhere. Every master detail page loses its voices section until at least one testimonial is approved **for that master**. This is intentional — the alternative is fake reviews on a production site — but is a visible regression for anyone who lands on a master detail page in the gap between merge and first approval.
4. Any pending testimonials submitted during PR #51's lifetime become visible in `/admin/testimonials` for decision.
5. Two pages (`/master`, `/master/[slug]`, `/home`) need a `revalidatePath("/", "layout")` after an approval to surface the change on the public site without a deploy. The action already does this.

## 13. Rollback

Revert the PR. The customer-facing pages snap back to `STUDIO_DATA.testimonials`. The `testimonials` table + any decided rows remain — they're orthogonal to the spec. Approved testimonials authored during this PR's lifetime would be invisible after a revert but not lost.

## 14. Prerequisites

None new. The PR depends only on what landed in PR #51 (`testimonials` table, `testimonial_submit` slice, profile page).

## 15. Open Questions

None. Per session brainstorming, the user approved the recommended posture:

- Master page voices = master-specific (`WHERE master_id = $masterId`).
- Home = single latest approved, hidden when none.
- Reject is soft; no hard-delete in v1.
- Author display: `firstName + last-initial`, with `username` → `email-head` → `"Guest"` fallbacks (email-head added in spec review to give Google-sign-in users a usable label without leaking the address).
- Avatar: `user.photoUrl` when present, gradient fallback.
- Role line removed (no equivalent for real users).
- Archive ≠ delete: archiving a master keeps testimonials in the DB; the public 404 on archived masters means they're inaccessible through the customer surface, but the admin queue still surfaces them.
- Admin sub-route auth posture follows the vip-requests precedent (unconditional `requireAdmin`), not the env-gated `/admin` root posture.
