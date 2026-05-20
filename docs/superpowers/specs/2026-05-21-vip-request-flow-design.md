# VIP Request Flow — Design Spec

**Date:** 2026-05-21
**Status:** Draft (pending user + spec-reviewer approval)
**Owner:** Violetta Beauty (violetik)
**Predecessors:** Membership tier rename (Petale/Violette/Atelier → Member/VIP) on branch
`fix/ensure-user-row-on-booking`. Booking flow architecture in
[`2026-05-20-google-calendar-integration-design.md`](./2026-05-20-google-calendar-integration-design.md).

## 1. Goal

Let visitors apply for the VIP membership tier from `/membership`, queue those
requests for admin review at `/admin/vip-requests`, and reflect approval / expiry
in the user's profile badge. Mirror the booking flow's `pending → approved` pattern.

**In scope:**

- New `vip_requests` table with status + expiration
- `POST /api/vip-requests` (submit), `POST /api/vip-requests/cancel` (user-cancel),
  `POST /api/vip-requests/:id/decide` (admin decide), `POST /api/vip-requests/:id/downgrade`
  (admin force-expire)
- `/membership` page CTA states: visitor → sign-in, signed-in → submit,
  pending → cancel, active VIP → "You're a VIP"
- `/profile` shows "Pending VIP" / "VIP" pill based on derived state
- `/admin/vip-requests` page: Pending queue, Active VIPs sorted by expiry,
  Expired list (newest 10, paginated)
- Admin role check (`users.role === 'admin'`) on decide and downgrade endpoints

**Out of scope:**

- Payment integration (admin handles billing offline)
- Email / Telegram notifications on status change
- Automatic renewal (admin re-approves manually after expiry)
- Granular perk gating (VIPs see the badge; functional perks are future work)
- Member tier as a separate state — Member is implicit for any signed-in user

## 2. Decisions locked in

| Question | Decision | Rationale |
|---|---|---|
| Member meaning | Any signed-in user is a Member by default; no DB state required | Free tier has no business state to track. Mirrors how booking treats "guest with account" |
| State store | New `vip_requests` table; current tier derived per-request | Auditable, mirrors `bookings`. Avoids stale snapshots on `users` |
| Expiration | `expires_at` column set at approval, default `decided_at + 30d`, admin-adjustable | Matches €180/month price implicit term; admin can override for trials or longer contracts |
| Tier derivation | `status='approved' AND expires_at > now()` → VIP, else (pending row exists) → Member + pending pill, else Member | Single query, no caching, automatic expiry handling |
| Downgrade | Admin sets `expires_at = now()` on the active approved row | One field flip; idempotent; no separate status value needed |
| Pending UX | "Cancel request" button on membership card + "Pending VIP" pill on profile | User can self-serve back out; matches polish of booking flow |
| Unauthed click | Redirect to `/sign-in?next=/membership` | Standard auth gate; no auto-submit magic |
| Admin auth | `users.role === 'admin'` required on decide/downgrade endpoints | Stricter than `/admin/bookings` (which only checks session) — but VIP is a higher-trust action |
| Expired list policy | Newest 10 visible inline, paginate the rest | Avoids clutter; keeps full audit reachable |
| Concurrency | Partial unique index `(user_id) WHERE status='pending'` | DB-level "one pending at a time" invariant |
| Notifications | None in v1 | YAGNI; user reload sees state; admin checks queue |
| Demo data | Drop static `STUDIO_DATA.profile.membership` field; tier derived from DB always | Removes the only place membership was a static fact |
| "Member · X" badge | Drop the "Member ·" prefix; render badge only when VIP or pending VIP | Reads cleaner; "Member" was redundant once it became the default |

## 3. Architecture

### 3.1 Module layout (FSD)

```
db/
  schema.ts                  ← + vipRequestStatus enum, vipRequests table
  vip-requests.ts            ← CRUD + tier derivation, mirrors db/bookings.ts
  migrations/0004_*          ← generated migration

features/
  vip-requests-admin/        ← mirrors features/bookings-admin
    ui/request-actions.tsx        ← Approve / Decline (pending)
    ui/active-vip-actions.tsx     ← Downgrade (active)
    ui/expired-actions.tsx        ← Re-approve (expired)
    ui/approve-form.tsx           ← inline date picker for expires_at
    api/decide.ts                 ← server action
    api/downgrade.ts              ← server action
    index.ts

features/
  vip-request-submit/        ← user-facing submit + cancel
    ui/vip-card-cta.tsx           ← client component owning the form/cancel
    api/submit.ts                 ← server action POST /api/vip-requests
    api/cancel.ts                 ← server action POST /api/vip-requests/cancel
    index.ts

app/[locale]/admin/vip-requests/
  page.tsx                   ← list pending + active + expired sections
  expired/page.tsx           ← paginated full history of expired rows

app/api/vip-requests/
  route.ts                   ← POST submit
  cancel/route.ts            ← POST cancel
  [id]/decide/route.ts       ← POST decide (admin)
  [id]/downgrade/route.ts    ← POST downgrade (admin)

views/membership/ui/
  membership-page.tsx        ← server component, resolves current state per session
  membership-tier-card.tsx   ← presentational, accepts state prop
  (new) vip-card-cta.tsx     ← thin client wrapper around features/vip-request-submit

views/profile/ui/
  profile-page.tsx           ← reads getCurrentTier(userId), renders pill
```

### 3.2 Layering rules (FSD)

- `db/vip-requests.ts` is pure data layer — no Next.js, no auth, no React.
  Returns DB rows or typed errors. Easy to unit-test against the existing
  Drizzle test setup ([`db/schema.test.ts`](../../../db/schema.test.ts)).
- `features/vip-request-submit/` owns the user-facing CTA state machine
  (visitor / member / pending / vip). Imports from `db/vip-requests.ts` for
  reads; calls API routes for writes. Reads happen in server components,
  writes happen via fetch from the client component.
- `features/vip-requests-admin/` is admin-only. Server actions verify
  `users.role === 'admin'` before any mutation.
- `views/membership` and `views/profile` import the public API of those
  features; no cross-slice reaches.

## 4. Data model

### 4.1 Schema additions

```ts
// db/schema.ts (additions)

export const vipRequestStatus = pgEnum("vip_request_status", [
  "pending", "approved", "declined", "cancelled",
]);

export const vipRequests = pgTable(
  "vip_requests",
  {
    id: text("id").primaryKey(),  // "vipreq_" + 16 hex
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: vipRequestStatus("status").notNull().default("pending"),
    note: text("note"),  // user note at submit time; nullable
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id),
    declineReason: text("decline_reason"),  // optional admin-only note
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
    activeIdx: index("vip_requests_active_expiry_idx")
      .on(table.expiresAt)
      .where(sql`status = 'approved'`),  // for sorted "expires soonest" queries
  }),
);

export type VipRequest = typeof vipRequests.$inferSelect;
export type NewVipRequest = typeof vipRequests.$inferInsert;
```

Migration generated via `drizzle-kit generate` → file `0004_*.sql`. Manual
review for the partial unique index syntax before running.

### 4.2 Tier derivation

A single function in `db/vip-requests.ts`:

```ts
export type CurrentTier =
  | { tier: "member" }
  | { tier: "member"; pendingRequestId: string }
  | { tier: "vip"; activeRequestId: string; expiresAt: Date };

export async function getCurrentTier(userId: string): Promise<CurrentTier> {
  // Single query: pull the user's most-recent approved-not-expired OR pending row.
  // Cancelled / declined / expired rows are ignored.
  // Returns the appropriate variant.
}
```

Implementation note: one SELECT with `status IN ('approved','pending')` and
`(status='pending' OR expires_at > now())`, ORDER BY priority (`approved` >
`pending`) then `created_at DESC`, LIMIT 1.

Called from:
- Server component `views/profile/ui/profile-page.tsx`
- Server component `views/membership/ui/membership-page.tsx`
- `/api/vip-requests` submit handler (to 409 if pending already exists)

No caching in v1. Sub-millisecond on the indexed table.

### 4.3 ID generation

`vipreq_<16 hex chars>` — matches the `bk_<8 hex>` pattern in
[`db/bookings.ts`](../../../db/bookings.ts) but 16 hex for collision headroom
since requests are user-initiated and may pile up over years.

## 5. API surfaces

All endpoints are `POST`, accept JSON, return JSON, and live under `/api/vip-requests`.

### 5.1 `POST /api/vip-requests` — submit

- Auth: signed-in user
- Body: `{ note?: string }`
- 200: `{ id, status: 'pending', createdAt }`
- 401: not signed in
- 409: user already has a pending row (returns the existing one's id)
- 409: user already has an active VIP (returns the active row's expiresAt)

### 5.2 `POST /api/vip-requests/cancel` — user cancel

- Auth: signed-in user
- Body: none
- Logic: update the user's own pending row to `status='cancelled'`, `decidedAt=now()`, `decidedBy=userId`
- 200: `{ id, status: 'cancelled' }`
- 404: no pending row

### 5.3 `POST /api/vip-requests/[id]/decide` — admin decide

- Auth: signed-in **admin** (`users.role === 'admin'`)
- Body: `{ action: 'approve' | 'decline', expiresAt?: ISO8601, declineReason?: string }`
- For `approve`: `status='approved'`, `decidedAt=now()`, `decidedBy=adminId`,
  `expiresAt = body.expiresAt ?? now() + 30 days`
- For `decline`: `status='declined'`, `decidedAt=now()`, `decidedBy=adminId`,
  `declineReason = body.declineReason ?? null`
- 200: updated row
- 403: not admin
- 404: row not found or already decided

### 5.4 `POST /api/vip-requests/[id]/downgrade` — admin force-expire

- Auth: signed-in admin
- Body: none
- Logic: `expiresAt = now()` on a row that is currently `status='approved' AND expires_at > now()`
- Idempotent: 200 even if already expired (no-op return)
- 403: not admin
- 404: row not found
- 409: row is not in "active approved" state (e.g. declined / cancelled)

## 6. UI changes

### 6.1 Membership page (`views/membership`)

Currently a fully static server component. Now resolves state per session:

```
state ∈ {
  visitor,           // not signed in
  member,            // signed in, no active or pending
  pending,           // signed in, has pending row
  vip,               // signed in, has active approved row (with expiresAt)
}
```

Card CTAs:

| state | Free Member card | VIP card |
|---|---|---|
| visitor | `"Sign in"` → `/sign-in?next=/membership` | `"Sign in to apply"` → `/sign-in?next=/membership` |
| member | `"You're a Member"` (disabled, ghost styling) | `"Join VIP"` → submits via fetch |
| pending | `"You're a Member"` (disabled) | `"Cancel request"` → submits via fetch |
| vip | `"You're a Member"` (disabled) — kept for consistency; could also hide | `"You're a VIP · expires {date}"` (disabled) |

The "Join VIP" button is in a small client component (`features/vip-request-submit/ui/vip-card-cta.tsx`) so it can manage `useTransition` for the submit pending state.

### 6.2 Profile page (`views/profile`)

Replaces `t("member_tag", { tier: profile.membership })` rendering with:

```tsx
const current = await getCurrentTier(session.user.id);
{current.tier === "vip" && <Pill variant="gold">{t("badge_vip")}</Pill>}
{current.tier === "member" && "pendingRequestId" in current && (
  <Pill variant="outline">{t("badge_pending_vip")}</Pill>
)}
// else: no pill
```

`member_tag` translation key is **removed** entirely (no surface uses
"Member · X" anymore). New keys:
- `Profile.badge_vip` = "VIP" / "VIP" / "VIP"
- `Profile.badge_pending_vip` = "Pending VIP" / "VIP в обработке" / "VIP у апрацоўцы"

### 6.3 Admin VIP requests page (`/admin/vip-requests`)

Three sections, top-to-bottom:

```
┌── Pending (count: N) ─────────────────────────┐
│  Alice         Submitted 2h ago               │
│  note: "I'd love to join..."                  │
│  [ Approve ] expires: [2026-06-20] [Decline]  │
└───────────────────────────────────────────────┘
┌── Active VIPs (count: N) ─────────────────────┐
│  Bob          expires in 3 days   [Downgrade] │
│  Carol        expires in 12 days  [Downgrade] │
│  …                                            │
└───────────────────────────────────────────────┘
┌── Expired (10 of N) ──────────────────────────┐
│  Dan          expired 2 days ago [Re-approve] │
│  …                                            │
│  [ Show all → /admin/vip-requests/expired ]   │
└───────────────────────────────────────────────┘
```

The Approve form is inline per-row, with a date input prefilled to today+30d.
On submit it calls `/api/vip-requests/[id]/decide` with action=`approve` and
the chosen `expiresAt`.

Re-approve (on an expired row) creates a **new** pending row owned by the same
user — it's a shortcut for the admin, equivalent to the user re-submitting.

### 6.4 Admin nav

Add a link on `/admin` to `/admin/vip-requests` so it's reachable without
typing the URL. The existing admin landing page is a thin shell — add an
"Inbox" section with cards for Bookings and VIP requests, each showing a
pending count badge.

## 7. Auth & authorization

- Submit / cancel endpoints: `await auth()` → 401 if no session
- Decide / downgrade endpoints: `await auth()` → 401; lookup user row →
  403 if `role !== 'admin'`
- `/admin/vip-requests` page: same gate as `/admin/bookings`, plus the role
  check before render

The role check is implemented as a small helper in `auth.ts` or a new
`shared/lib/auth.ts`:

```ts
export async function requireAdmin(): Promise<schema.User | NextResponse> {
  const session = await auth();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const user = await getUserById(session.user.id);
  if (!user || user.role !== "admin") return new NextResponse("forbidden", { status: 403 });
  return user;
}
```

`getUserById` is added to `db/users.ts`. Existing `/admin/bookings` route is
**not** retrofitted in this spec — it remains session-only as it is today.
Tightening it is tracked as future work.

## 8. Demo data

Currently `entities/studio/model/data.ts` has:

```ts
const profile: CustomerProfile = {
  name: "Lara K.",
  membership: "VIP",     // was "Violette"
  joined: 2024,
  ...
};
```

After this change:

- The `membership` field is dropped from `CustomerProfile` and `profile`
- `MembershipTierName` type can be removed entirely (replaced by `'vip'` literal in `CurrentTier`)
- Profile page renders Lara K.'s name + joined-year only, plus the
  derived-from-DB badge of whichever session user is signed in

For local dev without a DB, the profile shows no badge (matches Member
default). The mock `profile.name = "Lara K."` is **still** what the profile
page renders for the name + avatar — the mock isn't fully removed; just the
membership half of it.

## 9. Internationalization

All new copy is added to `messages/en.json`, `messages/ru.json`,
`messages/be.json`. Namespaces affected:

- `Membership` (new keys: `cta_pending_cancel`, `cta_youre_vip`, `cta_youre_member`, `cta_sign_in`)
- `Profile` (new keys: `badge_vip`, `badge_pending_vip`; remove: `member_tag`)
- `AdminVipRequests` (entirely new namespace, mirrors `AdminBookings`)

`Onboarding.membership_body` already updated upstream and stays as is.

## 10. Testing strategy

| Layer | Tool | What's tested |
|---|---|---|
| Pure logic | Vitest | `getCurrentTier` returns correct variant for each combination of rows; ID generator format |
| DB layer | Vitest + Drizzle test setup | `createVipRequest` 409 on existing pending; `cancelOwnVipRequest` 404 path; `decideVipRequest` writes correct fields; `downgradeVipRequest` is idempotent |
| API routes | Vitest + Next.js route testing | 401 / 403 / 409 paths; happy paths return shape |
| Components | Vitest + Testing Library | `VipCardCta` state machine (visitor / member / pending / vip variants); admin `RequestActions` button wiring |
| Admin page | Vitest | Renders 3 sections, sorts active by expires_at, paginates expired correctly |
| E2E | Playwright | `e2e/vip-request.spec.ts`: visitor → /sign-in → submit → admin approves → profile shows VIP. Plus expiry path via DB time-mock or explicit downgrade. |

## 11. Migration & rollout

- Single Drizzle migration: `0004_<name>.sql` creates the enum, table, and indexes
- No data backfill needed (no existing rows)
- Feature is dark-launched: `/admin/vip-requests` works as soon as a user has
  `role='admin'`; the membership page CTA only does something for signed-in
  users. Existing booking flow is unaffected.
- Rollback: drop the table and enum. No app deploys are blocked by the
  migration.

## 12. Open questions / future work

- **Notifications.** Telegram bot ping to admin on new pending? Email to
  user on approve/decline? Defer until the email/Telegram bot infra lands.
- **Renewal hint.** Show user a "Your VIP expires in 3 days — renew?" banner?
  Would need a re-submit flow; skip in v1 since admin handles offline.
- **Pricing / billing.** Connect to Stripe? Track payments per approval?
  Out of scope; the request flow stays a request-for-approval, not a checkout.
- **Bookings admin auth.** Add admin role check to `/admin/bookings` for
  parity. Currently session-only.
- **Granular perks.** Once VIPs exist, gate features (after-hours slots,
  priority calendar) on the derived tier. Each perk is its own decision.
