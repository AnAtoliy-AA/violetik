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

**No schema changes.** All work in this spec uses the existing columns + indexes.

## 4. Module Layout (FSD)

```
db/
  testimonials.ts                              # extend: add 3 functions
features/
  testimonials-admin/                          # NEW slice (mirrors vip-requests-admin)
    api/
      actions.ts                               # approveTestimonial, rejectTestimonial
      actions.test.ts
    ui/
      decision-actions.tsx                     # approve/reject buttons (client)
      decision-actions.stories.tsx
      decision-actions.test.tsx
      testimonial-row.tsx                      # one-row presentation
      testimonial-row.stories.tsx
      testimonial-row.test.tsx
    index.ts
entities/
  testimonial/                                 # NEW slice — locale-aware loader
    api/
      load-approved.ts                         # listApprovedTestimonials({masterId?, limit?})
      load-approved.test.ts
    model/
      types.ts                                 # ApprovedTestimonial
    index.ts
views/
  admin-testimonials/                          # NEW
    ui/
      admin-testimonials-page.tsx
      admin-testimonials-page.test.tsx
    index.ts
app/[locale]/admin/
  page.tsx                                     # MODIFY: add Testimonials tile + pending count
  testimonials/page.tsx                        # NEW
views/master/ui/master-page.tsx                # MODIFY: drop STUDIO_DATA fallback, use ApprovedTestimonial[]
app/[locale]/master/page.tsx                   # MODIFY: call listApprovedTestimonials({masterId})
app/[locale]/master/[slug]/page.tsx            # MODIFY: call listApprovedTestimonials({masterId})
views/home/ui/sections/testimonial-card.tsx    # MODIFY: accept prop, hide when null
views/home/ui/home-page.tsx                    # MODIFY: thread the testimonial prop in
app/[locale]/home/page.tsx                     # MODIFY: load the latest approved
entities/studio/api/load-with-photos.ts        # DELETE loadTestimonialsWithPhotos
entities/studio/model/data.ts                  # DELETE testimonials[] + export shape
entities/studio/model/types.ts                 # DELETE Testimonial interface
entities/studio/index.ts                       # MODIFY: drop Testimonial re-export
features/photo-upload-admin/model/slot.ts      # MODIFY: drop testimonial slot loop
messages/{en,ru,be}.json                       # MODIFY: add Admin.* + AdminTestimonials.* keys
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

Order: `created_at DESC` for `pending`/`rejected`, `decided_at DESC` for `approved` (most recently approved first).

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
  authorDisplay: string;     // "Lara K." / "Lara" / "lara_k" / "Guest"
  authorPhotoUrl: string | null;
  masterId: string;
  masterNameEn: string;
  masterNameRu: string;
  masterNameBe: string;
}
```

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
- Joins `users` for the author display fields and `masters` for the locale name fields
- `authorDisplay` is computed in JS, not SQL:
  ```ts
  function buildAuthorDisplay(u: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  }): string {
    if (u.firstName) {
      const initial = u.lastName ? ` ${u.lastName.trim().charAt(0)}.` : "";
      return `${u.firstName}${initial}`;
    }
    if (u.username) return u.username;
    return "Guest";
  }
  ```
  (Pure function — unit-tested separately so the loader test can stay an integration test.)

Returns `[]` when DB is null or table is missing.

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

Presentation only. Receives:

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

Renders the body, the master's locale-resolved name, the author display (computed inline from `row.author*`), submitted-at timestamp, status badge, and the slot. Avatar disc uses `row.authorPhotoUrl` when present, gradient fallback otherwise.

### 8.3 `<AdminTestimonialsPage>` — `views/admin-testimonials/ui/admin-testimonials-page.tsx`

Server component. Loads three buckets in parallel:

```ts
const [pending, approved, rejected] = await Promise.all([
  listTestimonialsByStatus("pending"),
  listTestimonialsByStatus("approved"),
  listTestimonialsByStatus("rejected"),
]);
```

Renders three sections in that order (matches `/admin/vip-requests`):

- **Pending** — `<TestimonialRow>` with `<DecisionActions>` slot. Empty state: `t("pending_empty")`.
- **Approved** — `<TestimonialRow>` without slot. Empty state: `t("approved_empty")`.
- **Rejected** — `<TestimonialRow>` without slot, dimmed (`opacity-60`). Empty state: `t("rejected_empty")`.

The page itself is `dynamic = "force-dynamic"` and the route file at `app/[locale]/admin/testimonials/page.tsx` reuses the same `AUTH_REQUIRED` gate as the admin dashboard root.

### 8.4 Admin dashboard tile

In [app/[locale]/admin/page.tsx](app/[locale]/admin/page.tsx), add a new `<li>` tile alongside the existing six. Reads `countPendingTestimonials()` via the same `Promise.all` block. Tile copy:

```
inbox_testimonials                — "Testimonials"
inbox_testimonials_caption        — "<N> pending"  (uses existing inbox_pending_suffix)
```

## 9. Public Surfaces — wiring in approved reviews

### 9.1 Master page

[views/master/ui/master-page.tsx](views/master/ui/master-page.tsx):

- Drop the `STUDIO_DATA.testimonials` import + the `?? STUDIO_DATA.testimonials` fallback.
- `testimonials` prop becomes `readonly ApprovedTestimonial[]` (was `readonly Testimonial[]` from `entities/studio`).
- The voices section renders **only when the array is non-empty** (`testimonials.length > 0`). When empty, the entire `<section>...Voices...</section>` block is dropped from the DOM — the master page just flows from the quote → stats → CTA without a hole.
- Author display: `tm.authorDisplay`. Avatar: `tm.authorPhotoUrl` when present, gradient fallback otherwise (same conditional `<Image>` vs gradient pattern that already exists in the file).
- The mock `role` line is removed from the testimonial card (no `tm.role` anymore — drop the `<span className="font-mono ...">`).

Callers ([app/[locale]/master/page.tsx](app/[locale]/master/page.tsx) and [app/[locale]/master/[slug]/page.tsx](app/[locale]/master/[slug]/page.tsx)):

```ts
const testimonials = await listApprovedTestimonials({ masterId: master.id, limit: 10 });
```

Replaces the existing `loadTestimonialsWithPhotos()` calls. The "with photos" function is deleted — user testimonials use `user.photoUrl`, not the `studio_photos` table.

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

- **Delete** `loadTestimonialsWithPhotos` from [entities/studio/api/load-with-photos.ts](entities/studio/api/load-with-photos.ts) (no callers remain).
- **Delete** the `testimonials: Testimonial[]` field from [entities/studio/model/data.ts](entities/studio/model/data.ts) and the `Testimonial` interface from [entities/studio/model/types.ts](entities/studio/model/types.ts). Drop the re-export from [entities/studio/index.ts](entities/studio/index.ts).
- **Delete** the `for (const t of STUDIO_DATA.testimonials)` loop in [features/photo-upload-admin/model/slot.ts:43](features/photo-upload-admin/model/slot.ts#L43). The `photoSlotKind` enum keeps `testimonial` as a value (no migration churn); admins will just never see a testimonial slot in the picker. If any historical `studio_photos` rows with `slot_kind='testimonial'` exist, they remain in the DB unused — harmless.

## 10. i18n

New keys per locale:

```jsonc
// Admin.*
"inbox_testimonials": "Testimonials",
"inbox_testimonials_caption": "review queue",

// AdminTestimonials.*
"plate_title": "Testimonials",
"meta_title": "Testimonials",
"eyebrow": "Moderation",
"hero_title": "Pending reviews",
"hero_paragraph": "Approve to publish on the master page and home. Reject to keep the submitter informed without going live.",
"section_pending": "Pending",
"section_approved": "Approved",
"section_rejected": "Rejected",
"pending_empty": "No pending reviews. New submissions land here.",
"approved_empty": "Nothing approved yet.",
"rejected_empty": "No rejected reviews.",
"submitted_at": "Submitted",
"decided_at": "Decided",
"status_pending": "Pending",
"status_approved": "Approved",
"status_rejected": "Rejected",
"action_approve": "Approve",
"action_reject": "Reject"
```

Existing `Profile.status_*` keys stay; the admin set is a separate namespace so the moderation UI can tune wording (verb vs adjective) without affecting the customer-facing badges.

`ru` and `be` translations are mirrored from the existing testimonial copy (Russian/Belarusian translators already established the voice in PR #51's keys).

## 11. Tests

### 11.1 DB layer (`db/testimonials.test.ts` — extend)

`it.skipIf(!process.env.DATABASE_URL)` for all integration tests, same shape as the existing `createTestimonial` tests:

- `listTestimonialsByStatus("pending")` returns the rows we seeded with `status='pending'`, joined fields populated.
- `listTestimonialsByStatus("approved")` ordered by `decided_at DESC`.
- `decideTestimonial({action:"approve"})` flips a pending row, sets `decided_at`/`decided_by`, returns the row.
- `decideTestimonial({action:"approve"})` on an already-approved row returns `null` (status guard).
- `decideTestimonial({action:"reject"})` flips a pending row to rejected.
- `countPendingTestimonials()` counts only pending.

### 11.2 Entity loader (`entities/testimonial/api/load-approved.test.ts`)

- `listApprovedTestimonials()` filters by approved status only.
- `listApprovedTestimonials({masterId})` filters to a single master.
- `listApprovedTestimonials({limit:1})` respects the cap.
- `buildAuthorDisplay` unit tests for each branch of the fallback (firstName+last, firstName-only, username-only, none).

### 11.3 Server actions (`features/testimonials-admin/api/actions.test.ts`)

Mirrors `features/vip-requests-admin/api/actions.test.ts`. Mocks `requireAdmin`, mocks `decideTestimonial`, asserts return shapes for:
- `unauthorized` (no session)
- `forbidden` (non-admin)
- `not-found` (decideTestimonial returns null)
- `ok` (calls revalidatePath, returns id)

### 11.4 UI (`features/testimonials-admin/ui/*.test.tsx`)

- `<DecisionActions>` — clicking Approve calls `approveTestimonial(id)`; clicking Reject calls `rejectTestimonial(id)`; both buttons disable during transition.
- `<TestimonialRow>` — renders body + author + master name; uses locale name; shows decision slot only when provided.
- `<AdminTestimonialsPage>` — composes three sections, falls through to empty-state strings when each list is empty.

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
- Adds i18n keys.

On deploy:

1. `npm run build` passes — no schema changes.
2. The admin dashboard immediately shows the new tile (count `0` while the DB has no pending rows).
3. Customer-facing voices/home testimonial sections disappear from the live site until an admin approves the first review (intentional — no more demo copy on production).
4. Any pending testimonials submitted during PR #51's lifetime become visible in `/admin/testimonials` for decision.

## 13. Rollback

Revert the PR. The customer-facing pages snap back to `STUDIO_DATA.testimonials`. The `testimonials` table + any decided rows remain — they're orthogonal to the spec.

## 14. Prerequisites

None new. The PR depends only on what landed in PR #51 (`testimonials` table, `testimonial_submit` slice, profile page).

## 15. Open Questions

None. Per session brainstorming, the user approved the recommended posture:

- Master page voices = master-specific (`WHERE master_id = $masterId`).
- Home = single latest approved, hidden when none.
- Reject is soft; no hard-delete in v1.
- Author display: `firstName + last-initial`, with `username` / `"Guest"` fallbacks.
- Avatar: `user.photoUrl` when present, gradient fallback.
- Role line removed (no equivalent for real users).
