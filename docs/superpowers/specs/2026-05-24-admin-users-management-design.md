# Admin Users Management — Design

**Date:** 2026-05-24
**Status:** Approved (user fast-forwarded with "select recommended until PR open")
**Surface:** `/[locale]/admin/users` (list, detail, merge)

## 1. Problem & goals

Today the `users` table records every Telegram and Google sign-in, but there's no admin surface to look at, manage, or curate those rows. The studio admin needs to:

1. See every user that has ever signed in.
2. Change a user's role (`customer` ↔ `admin`).
3. Attach an admin-only note to a user.
4. Grant VIP status — with or without an expiry.
5. Merge two rows that represent the same human (signed in via both Telegram and Google).

## 2. Non-goals (YAGNI)

- Deleting users without merging.
- Bulk operations (multi-select role change, etc.).
- Email-based password reset, impersonation, "log in as user".
- A dedicated audit log table — the admin-note auto-append after a merge is enough trail for v1.
- Importing users from CSV / other systems.

## 3. Schema changes

One Drizzle migration: `db/migrations/0015_users_admin_note.sql`.

```sql
ALTER TABLE users ADD COLUMN admin_note text;
```

Drizzle schema add to [db/schema.ts](../../../db/schema.ts):

```ts
// inside users pgTable
adminNote: text("admin_note"),
```

**VIP is not a column on `users`.** It continues to live in `vip_requests`. Admin-granted VIP becomes a `status='approved'` row created directly (skipping the `pending` step). A lifetime VIP is `status='approved' AND expires_at IS NULL`. Four existing functions in [db/vip-requests.ts](../../../db/vip-requests.ts) need updating:

- `getCurrentTier(userId)` — treat `expires_at IS NULL` as never-expires (lifetime VIP).
- `listActiveVips()` — include rows with `expires_at IS NULL`. Sort `expires_at NULLS LAST` so lifetime VIPs land at the end.
- `listExpiredVipRequests()` — `expires_at IS NOT NULL AND expires_at <= now()` (NULL rows are never expired).
- `countExpiredVipRequests()` — same NULL exclusion.

The existing partial index `vip_requests_active_expiry_idx ON expires_at WHERE status='approved'` keeps working — NULL `expires_at` values simply don't contribute to the ordering.

## 4. Routes

```
/[locale]/admin/users                       → list + filters + suggested merges
/[locale]/admin/users/[id]                  → user detail (role, note, VIP, merge candidates)
/[locale]/admin/users/[id]/merge/[otherId]  → merge confirmation page
```

All gated by `requireAdmin()` from [shared/lib/auth-server.ts](../../../shared/lib/auth-server.ts), identical pattern to `/admin/vip-requests`. All pages use `dynamic = "force-dynamic"`. Add a new inbox tile on `/admin` linking to `/admin/users`.

## 5. List page (`/admin/users`)

### Composition
- `AppHeader back="/admin" title={t("plate_title")} admin`
- Hero block (`Eyebrow gold` + `<h1>` + paragraph) — matches existing admin pages.
- **Suggested merges** section at top — collapses to nothing when empty.
- Search + filter bar.
- Users list.
- Pagination footer.

### Search & filters (URL-driven)
| Query param | Values | Effect |
|---|---|---|
| `q` | free text | `ILIKE '%q%'` over `id`, `email`, `firstName`, `lastName`, `username` |
| `role` | `all` (default) / `admin` / `customer` | Filter by `users.role` |
| `vip` | `all` (default) / `active` / `none` | `active`: has a row in `vip_requests` with `status='approved' AND (expires_at IS NULL OR expires_at > now())`. `none`: no such row. |
| `page` | int ≥ 1, default 1 | Pagination (20 per page) |

Search input is a `<form method="get">` so it works without JS; the filter pills are `<Link>` components that swap `?role=…&vip=…`. Page state is preserved across filter changes only when the new filters could still contain the current page — otherwise reset to page 1.

### Row layout
Avatar (32×32 round) · display name · provider icons (TG, Google badges; both if linked) · email or username (whichever is set) · role pill · VIP badge (with expiry; "lifetime" for NULL) · "last seen" relative time · `RoleToggle` (segmented two-state customer/admin).

Clicking the row body opens detail. The `RoleToggle` is a client component that stops propagation, calls a server action `setUserRoleAction`, and reflects the new state with `router.refresh()`.

### Suggested merges section
Top 5 candidate pairs from `suggestMergeCandidates({ scope: "all" })` (see §8). Each row shows both avatars + names + matched-signal chips and a "Review merge →" link to `/admin/users/[lowerId]/merge/[higherId]` (lexicographic order picks the URL).

## 6. Detail page (`/admin/users/[id]`)

Sections, top to bottom:

1. **Identity** — avatar, display name, two side-by-side cards (one per provider) when both linked. Telegram card: `@username` + `tg:<id>`. Google card: email + `google:<sub>`. Plus `createdAt` and `lastSignInAt`.
2. **Role** — segmented control customer/admin. Server action `setUserRoleAction(id, role)`. Server-side guard: refuse `admin → customer` when `count(role='admin') == 1` — returns a typed error rendered inline.
3. **Admin note** — `<textarea>` with helper line "Only admins see this." Save button calls `setAdminNoteAction(id, note)`. Empty state allowed (set to NULL).
4. **VIP** — current tier badge (`member` / `member-pending` / `vip · expires Apr 12` / `vip · lifetime`). Buttons:
   - **Grant VIP** form (visible when current tier is `member` or `member-pending`): `<input type="date">` (default = today + 30d) + checkbox "no expiry". Server action `grantVipAction(id, { expiresAt | null })` → inserts a `vip_requests` row with `status='approved'`, `decidedBy = current admin`, `expiresAt = chosen or NULL`. If a pending request exists, cancel it first (set `status='cancelled'`).
   - **Revoke VIP** (visible when tier is `vip`): calls existing `downgradeVipRequest` (sets `expires_at = now()`). For lifetime VIPs, the same action — sets `expires_at = now()`.
5. **Bookings** — last 5 with status pills, plus link "All bookings →" to `/admin/bookings?userId=…`. (Note: `/admin/bookings` filtering by userId may need a small follow-up — out of scope for v1 if absent, just show the count.)
6. **Testimonials** — pending count + approved count.
7. **Possible duplicates** — `suggestMergeCandidates({ scope: "for", userId: id })`. Each row "Review merge →" linking to the merge page.

## 7. Merge confirmation page (`/admin/users/[id]/merge/[otherId]`)

Pre-merge server data fetch:
- Both user rows.
- Conflict report from `getMergeConflicts(idA, idB)` (see §9).
- Stats per row: booking count, testimonial count (split pending/approved), pending VIP request id (if any), active VIP (if any).

### UI
- Side-by-side comparison table: id, providers, name, email, photo, role, createdAt, lastSignInAt, counts, VIP.
- **Survivor** radio — which row's `id` is kept. Defaults to the older `createdAt`. The survivor's `id` is what every other table will continue to reference, so this is a meaningful choice.
- **Per-field overrides** for `firstName`, `lastName`, `email`, `photoUrl`. Each is a radio "survivor's value" / "other's value". Default: pick the survivor's value when non-null, else the other's. If both are null, the field is greyed out.
- **Conflict warnings** block. Each conflict is one of:
  - Both rows have a `pending` `vip_request`. Resolution hint: cancel one on `/admin/vip-requests` first.
  - Both rows have a `pending` `testimonial` for the same `master_id`. Resolution hint: decide one on `/admin/testimonials` first.
- If any conflict is present, the **Merge** button is disabled.
- "Cancel" link → back to `/admin/users/[id]`.

### Server action `mergeUsersAction({ survivorId, loserId, overrides })`
Re-runs conflict check (defence in depth). If clean, runs everything below inside a single Drizzle transaction:

1. **Re-point FK references** from `loserId` → `survivorId`:
   - `UPDATE bookings SET user_id = $survivor WHERE user_id = $loser`
   - `UPDATE vip_requests SET user_id = $survivor WHERE user_id = $loser`
   - `UPDATE vip_requests SET decided_by = $survivor WHERE decided_by = $loser`
   - `UPDATE testimonials SET user_id = $survivor WHERE user_id = $loser`
   - `UPDATE testimonials SET decided_by = $survivor WHERE decided_by = $loser`
   - `UPDATE site_settings SET updated_by = $survivor WHERE updated_by = $loser`
   - `UPDATE service_categories SET updated_by = $survivor WHERE updated_by = $loser`
   - `UPDATE services SET updated_by = $survivor WHERE updated_by = $loser`
   - `UPDATE studio_photos SET uploaded_by = $survivor WHERE uploaded_by = $loser`
2. **`google_oauth_tokens`** — PK is `userId`. If loser has a row and survivor doesn't, re-point the row's `user_id`. If both have rows, keep the survivor's (drop loser's).
3. **Delete loser row** — `DELETE FROM users WHERE id = $loser`. This step runs **before** the survivor patch in step 4 because both `users.telegramId` and `users.googleSub` carry `UNIQUE` constraints; updating the survivor with the loser's provider id while the loser row still holds it would abort the transaction with a unique-constraint violation. Step ordering is also load-bearing for cascades: `bookings`, `vip_requests`, `testimonials`, and `google_oauth_tokens` all have `ON DELETE CASCADE` to `users.id`. The FK re-pointing in steps 1–2 must complete before this `DELETE`, or the cascade would silently destroy data we just merged.
4. **Absorb provider id + per-field overrides + audit note** — single `UPDATE` on the survivor row:
   - If loser had `telegramId` and survivor doesn't, copy it.
   - If loser had `googleSub` and survivor doesn't, copy it.
   - Apply per-field overrides for `firstName`, `lastName`, `email`, `photoUrl`.
   - Prepend an audit line to `admin_note`:
     ```
     [merged 2026-05-24 — absorbed tg:12345 by google:abcdef]
     ```
     (Existing note kept after a blank-line separator; admin can edit afterward.)

If anything fails, the transaction rolls back and the action returns a typed error rendered on the merge page. On success, redirect to `/admin/users/[survivor]`.

## 8. Duplicate suggestion algorithm

In `db/users-admin.ts`:

```ts
export interface MergeCandidate {
  a: User; // lexicographically smaller id
  b: User;
  score: number;
  signals: ("email" | "photo" | "name" | "tg-google-handle")[];
}

export async function suggestMergeCandidates(
  opts: { scope: "all" } | { scope: "for"; userId: string },
): Promise<MergeCandidate[]>;
```

**Constraints on a candidate pair `(a, b)`:**
- `a.id !== b.id`.
- Exactly one is `tg:*` and the other is `google:*` (no two-Telegram or two-Google pairs — those would never represent a cross-provider merge).
- Pair is ordered so `a.id < b.id` for stability.

**Signals (score):**
| Signal | When it fires | Weight |
|---|---|---|
| `email` | Both rows have `email`, normalized (lowercased + trimmed) values are equal | 4 |
| `photo` | Both rows have `photoUrl`, values are equal | 3 |
| `name` | Both rows have `firstName` AND `lastName`, lowercase-equal on both | 2 |
| `tg-google-handle` | `tg.username` (lowercased) equals the local-part (before `@`) of `google.email` lowercased | 1 |

Pairs with `score >= 2` qualify. Returned sorted by score desc, then by max `lastSignInAt` desc. Capped at 50 sitewide. The `scope: "for"` variant restricts to pairs where `a.id === userId || b.id === userId` (and returns all matches, uncapped, since per-user is bounded).

Implementation: a single CTE-based SQL query (or several drizzle subqueries unioned) is fine — the user volume is small.

## 9. Merge conflict detection

```ts
export interface MergeConflicts {
  bothPendingVip: boolean;
  pendingTestimonialCollisions: string[]; // master_ids
}

export async function getMergeConflicts(
  idA: string,
  idB: string,
): Promise<MergeConflicts>;
```

Sources:
- `bothPendingVip`: `vip_requests` has rows for both ids with `status='pending'`. The partial unique index `vip_requests_one_pending_per_user` allows up to one pending per user; merging would violate it.
- `pendingTestimonialCollisions`: `master_id` values where `testimonials` has a `status='pending'` row for both ids. The partial unique index `testimonials_one_pending_per_pair` would be violated.

No other unique constraints on FK columns; `bookings_scheduled_for_active_uniq` can't be triggered by a merge (slots are time-keyed, not user-keyed).

## 10. Server-side last-admin guard

```ts
// db/users-admin.ts
export async function setUserRole(
  id: string,
  role: "customer" | "admin",
): Promise<
  | { ok: true; user: User }
  | { ok: false; reason: "last-admin" }
>;
```

If target is currently `admin` and new role is `customer`, run `SELECT count(*) FROM users WHERE role='admin'`. If `count == 1`, return `{ ok: false, reason: "last-admin" }`. Otherwise update. The server action exposes this typed result to the client, which renders a small inline error.

## 11. FSD layout

| Path | Purpose |
|---|---|
| `db/users-admin.ts` | All admin-side user queries & mutators (list, detail, role, note, VIP grant/revoke, merge, suggestions, conflict check). Separate file from `db/users.ts` to keep the auth-path file untouched. |
| `db/users-admin.test.ts` | Vitest unit tests covering each function (TDD red→green). |
| `features/users-admin/` | Client interactives + server actions. Exports: `RoleToggle`, `AdminNoteForm`, `VipGrantForm`, `VipRevokeButton`, `MergeForm`, plus action functions. Public API via `index.ts`. |
| `app/[locale]/admin/users/page.tsx` | List page (server component composing search/filters/suggestions/list). |
| `app/[locale]/admin/users/[id]/page.tsx` | Detail page. |
| `app/[locale]/admin/users/[id]/merge/[otherId]/page.tsx` | Merge confirmation page. |
| `app/[locale]/admin/page.tsx` | Add a new inbox tile linking to `/admin/users`. |
| `messages/en.json`, `messages/ru.json`, `messages/by.json` | New `AdminUsers` namespace with full translations. |
| `db/migrations/0015_users_admin_note.sql` | The schema migration. |
| `db/vip-requests.ts` | Update functions for NULL-expiry semantics. |
| `db/vip-requests.test.ts` | Add tests for lifetime VIPs. |
| `e2e/admin-users.spec.ts` | Happy-path Playwright tests (filter, role toggle, grant VIP, merge). |

## 12. i18n keys (sketch)

Under `AdminUsers`:
```
plate_title, meta_title, eyebrow, hero_title, hero_paragraph,
search_placeholder, filter_role_all, filter_role_admin, filter_role_customer,
filter_vip_all, filter_vip_active, filter_vip_none,
section_suggested_merges, suggested_signal_email, suggested_signal_photo,
suggested_signal_name, suggested_signal_handle,
role_customer, role_admin, last_seen_never, last_seen_ago,
empty_list,
detail.section_identity, detail.section_role, detail.section_note, detail.section_vip,
detail.section_bookings, detail.section_testimonials, detail.section_duplicates,
detail.note_placeholder, detail.note_only_admin, detail.note_save, detail.note_saved,
detail.role_save_failed_last_admin,
detail.vip_member, detail.vip_member_pending, detail.vip_expires, detail.vip_lifetime,
detail.cta_grant_vip, detail.cta_revoke_vip, detail.grant_no_expiry, detail.grant_until,
merge.title, merge.cta_merge, merge.cta_cancel, merge.survivor_label,
merge.override_first_name, merge.override_last_name, merge.override_email, merge.override_photo,
merge.conflict_pending_vip, merge.conflict_pending_testimonial,
```

(Final keys may be reshaped during implementation; full set will live under one top-level `AdminUsers` namespace.)

## 13. Testing

**Unit (Vitest, `db/users-admin.test.ts`):**
- `listUsers` — search matches across all five fields; role filter; VIP filter (active includes lifetime); pagination.
- `setUserRole` — happy path; last-admin guard refuses; updates `users.role`.
- `setAdminNote` — set, replace, clear (NULL).
- `grantVip` — with expiry; without expiry (lifetime); cancels prior pending request.
- `revokeVip` — bumps `expires_at`; idempotent for already-expired rows.
- `suggestMergeCandidates` — only cross-provider pairs; signal scoring; threshold; `scope: "for"` variant.
- `getMergeConflicts` — detects both-pending-vip; detects shared-master pending testimonial.
- `mergeUsers` — happy path migrates every FK; copies provider id; applies overrides; appends audit note; deletes loser; transactional rollback on simulated failure; refuses when conflicts present.

**Vitest tests for updated `db/vip-requests.ts`:** lifetime VIP (NULL expiresAt) treated as active by `getCurrentTier` and `listActiveVips`, excluded from `listExpiredVipRequests`.

**E2E (Playwright, `e2e/admin-users.spec.ts`):**
- Admin opens `/admin/users`, sees seeded users.
- Search by name narrows the list.
- Role filter pill shows admins only.
- Role toggle on a row changes the user's role.
- Detail page: set admin note, grant lifetime VIP, revoke VIP.
- Merge: open a suggested pair, confirm survivor + per-field overrides, complete merge, end up on survivor's detail page with absorbed provider.

## 14. Risks & open considerations

- **`/admin/bookings?userId=`** — current bookings admin page may not filter by `userId`. v1 just shows a count and link; if the link 404s in practice we'll add the filter as a small follow-up, but not in this PR.
- **Migration rollback** — `admin_note` is purely additive; no rollback path required.
- **Lifetime VIP UX in `/admin/vip-requests`** — the existing page currently sorts active VIPs by `expiresAt`. Lifetime rows will surface at the end; we'll show "lifetime" instead of a countdown badge for those rows.
- **Audit trail** — the auto-appended admin note is human-readable but not machine-parseable. Acceptable for v1 — a real audit-log table is future work.
