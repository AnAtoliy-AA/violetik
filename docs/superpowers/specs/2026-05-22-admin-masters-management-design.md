# Admin Masters Management — Design

**Status:** Approved (autonomous, "Recommended" defaults)
**Author:** Claude (Opus 4.7)
**Date:** 2026-05-22

## 1. Goal & Non-goals

**Goal.** Replace the single hardcoded `artist` (Violetta Marchenko, defined in
[entities/studio/model/data.ts](../../../entities/studio/model/data.ts)) with a
DB-backed `masters` collection that the admin can fully CRUD. Surface a
master-selection step in the booking funnel that auto-skips when exactly one
master is eligible to perform the chosen service. Wire master ↔ service
specialty constraints so the customer never reaches a dead-end at the master
step.

**Non-goals (v1):**
- Per-master scheduling (every master shares the same `BOOKING_TIMES` grid).
- Per-master pricing.
- Customer-facing master ratings / reviews.
- Master self-service portal — admin edits everything.
- Multi-photo galleries per master — one portrait per master, via the existing
  `studio_photos` infrastructure.

## 2. Data model

### 2.1 Enum — master_status

```ts
export const masterStatus = pgEnum("master_status", [
  "draft",
  "published",
  "archived",
]);
```

Mirrors `serviceStatus` for consistency. `draft` and `archived` are admin-only;
only `published` rows are visible on `/master`, on the booking step, and
counted by auto-skip logic.

### 2.2 Table — masters

```ts
export const masters = pgTable("masters", {
  id: text("id").primaryKey(),              // slug, e.g. "violetta"
  nameEn: text("name_en").notNull(),
  nameRu: text("name_ru").notNull(),
  nameBe: text("name_be").notNull(),
  roleEn: text("role_en").notNull(),
  roleRu: text("role_ru").notNull(),
  roleBe: text("role_be").notNull(),
  bioEn:  text("bio_en").notNull(),
  bioRu:  text("bio_ru").notNull(),
  bioBe:  text("bio_be").notNull(),
  quoteEn: text("quote_en").notNull(),
  quoteRu: text("quote_ru").notNull(),
  quoteBe: text("quote_be").notNull(),
  years: integer("years").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  status: masterStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
```

Slug constraint: `/^[a-z0-9-]+$/`. Frozen after first save (mirrors services).

Photo lives in `studio_photos` keyed by `kind="master"` + `slotId=masters.id`.
The seeded "violetta" slot id remains valid because the seeded master row's
slug is `"violetta"` — no existing studio_photos row is invalidated.

### 2.3 Join table — master_services

```ts
export const masterServices = pgTable("master_services", {
  masterId:  text("master_id").notNull().references(() => masters.id,  { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  pk: primaryKey({ columns: [t.masterId, t.serviceId] }),
  masterIdx: index("master_services_master_idx").on(t.masterId),
  serviceIdx: index("master_services_service_idx").on(t.serviceId),
}));
```

Each `(master, service)` pair represents "this master performs this service."
CASCADE on both sides: deleting either side cleans up the join.

### 2.4 bookings.master_id (Phase 2)

```ts
masterId: text("master_id").references(() => masters.id, { onDelete: "restrict" })
// + index("bookings_master_idx").on(masterId)
```

Nullable for back-compat with bookings created before this feature lands.
Required at submit when ≥2 published masters can perform the chosen service.
`ON DELETE RESTRICT` is belt-and-braces; archive-guard already prevents the
delete path that would orphan a booking.

## 3. Migration & seed

**Phase 1 migration** (`db/migrations/0008_admin_masters.sql`, generated +
manual seed):

1. `CREATE TYPE master_status AS ENUM (...)`
2. `CREATE TABLE masters (...)` with FK constraint + indexes
3. `CREATE TABLE master_services (...)` with composite PK + indexes
4. Idempotent seed of `'violetta'` master row with EN/RU/BE columns populated
   from `STUDIO_DATA.artist` (translated by author at seed time, same pattern
   as services seed in `0007_admin_services.sql`).
5. Idempotent seed of `master_services` linking `'violetta'` to every
   currently `published` service:

   ```sql
   INSERT INTO master_services (master_id, service_id)
   SELECT 'violetta', id FROM services WHERE status = 'published'
   ON CONFLICT (master_id, service_id) DO NOTHING;
   ```

Result: the customer site looks unchanged on first deploy — one master who
does every service.

**Phase 2 migration** (`db/migrations/0009_bookings_master_id.sql`):

1. `ALTER TABLE bookings ADD COLUMN master_id text REFERENCES masters(id) ON DELETE RESTRICT`
2. `CREATE INDEX bookings_master_idx ON bookings(master_id)`
3. Backfill: `UPDATE bookings SET master_id = 'violetta' WHERE master_id IS NULL`
   — safe because the seed left Violetta as the only published master, and
   any other masters added before Phase 2 would have been opt-in only.

## 4. Read pipeline

### 4.1 `db/masters.ts`

```ts
listAllMasters(): Promise<MasterRow[]>          // every row, ordered by sort_order, then id
listPublishedMasters(): Promise<MasterRow[]>    // status === 'published'
getMasterById(id: string): Promise<MasterRow | null>
getMasterIdsForService(serviceId: string): Promise<string[]>  // join lookup
getServiceIdsForMaster(masterId: string): Promise<string[]>   // join lookup
getServiceIdsHavingAnyPublishedMaster(): Promise<Set<string>> // for orphan-service hide
```

Pattern mirrors `db/services.ts`: `if (!db) return [...]` short-circuit,
`isMissingTable` guard for 42P01.

### 4.2 `entities/master/`

```
entities/master/
├── model/
│   ├── types.ts        Master runtime shape (locale-resolved name/role/bio/quote)
│   └── schema.ts       Zod: masterFormSchema, slug, requiredLocaleString
├── api/
│   └── load.ts         loadMastersForLocale, loadMasterBySlugForLocale, loadPublishedMasterCount, loadEligibleMastersForService
└── index.ts            public exports
```

Runtime `Master` type:

```ts
interface Master {
  id: string;            // slug
  name: string;          // locale-resolved
  role: string;
  bio: string;
  quote: string;
  years: number;
  sortOrder: number;
  image?: ImageAsset;    // from studio_photos
  serviceIds: string[];  // specialties
}
```

### 4.3 Service catalog — orphan hiding

`db/services.ts.listPublishedServices()` keeps its current signature but
internally filters out services whose id isn't in
`getServiceIdsHavingAnyPublishedMaster()`. Admin views continue to use
`listAllServices()` and badge orphans inline. The filter sits at the DB layer
so every consumer (menu, sitemap, home strip, booking service step) benefits
without per-call wiring.

## 5. Admin UX

### 5.1 Routes & inbox

- New: `/admin/masters` — list view (mirrors `/admin/services`)
- New: `/admin/masters/[id]` — editor (`id === "new"` ⇒ create)
- `/admin` inbox: add 5th tile labelled "Masters" → `/admin/masters`

### 5.2 List view (`/admin/masters`)

Two sections, same shape as services-admin:

- **Published & drafts** — drag-reorder, edit, archive
- **Archived** — view, edit, restore

Per-row badges: status pill, years count, specialty count (e.g. "12
services"). Reorder writes new `sort_order` via `reorderMasters([...ids])`.

### 5.3 Editor (`/admin/masters/[id]`)

Top-down field order:

1. **Slug** (frozen on edit)
2. **Status** dropdown
3. **Years** (integer ≥ 0, ≤ 80)
4. **Name** × en/ru/be (required, ≤ 80 chars)
5. **Role** × en/ru/be (required, ≤ 120 chars)
6. **Bio** × en/ru/be textarea (required, ≤ 1000 chars)
7. **Quote** × en/ru/be textarea (required, ≤ 280 chars)
8. **Specialties** fieldset — checkboxes grouped by service category; ticking
   a service adds the `(masterId, serviceId)` join row, unticking removes it.
   Bulk "Select all / Clear" pair per category.
9. **Photo** slot — embedded `PhotoUploadRow` with `kind="master"`,
   `id=master.id`. Same hoisting pattern fix shipped in
   [docs/superpowers/specs/...services...](./2026-05-22-admin-services-management-design.md):
   the photo row renders above the editor's `<form>`.

### 5.4 Validation

Zod in `entities/master/model/schema.ts`:

```ts
export const masterFormSchema = z.object({
  id: slugSchema,
  nameEn: requiredLocaleString(80),
  nameRu: requiredLocaleString(80),
  nameBe: requiredLocaleString(80),
  roleEn: requiredLocaleString(120),
  roleRu: requiredLocaleString(120),
  roleBe: requiredLocaleString(120),
  bioEn:  requiredLocaleString(1000),
  bioRu:  requiredLocaleString(1000),
  bioBe:  requiredLocaleString(1000),
  quoteEn: requiredLocaleString(280),
  quoteRu: requiredLocaleString(280),
  quoteBe: requiredLocaleString(280),
  years: z.number().int().min(0).max(80),
  sortOrder: z.number().int().min(0),
  status: masterStatusSchema,
  serviceIds: z.array(slugSchema).max(200),
});
```

Server actions strip `id` on update (same Omit pattern as services).

### 5.5 Archive guard

`archiveMaster(id)` calls `countUpcomingBookingsForMaster(id)` first
(scheduled_for > now() AND status != 'cancelled'). If > 0, returns
`{ ok: false, error: "master_has_upcoming_bookings", blockingCount: N }`. UI
renders an inline error with the count.

### 5.6 Server actions

```
features/masters-admin/api/
├── _common.ts                 gateAdmin()
├── create-master.ts
├── update-master.ts
├── archive-master.ts
├── restore-master.ts
├── reorder-masters.ts
└── set-master-services.ts     replaces the full set of specialty rows for a master
```

All return `{ ok: true } | { ok: false, error: string, ... }`. Auth posture
matches services-admin: gate only when `TELEGRAM_BOT_TOKEN` is set.

### 5.7 Admin photos page

`features/photo-upload-admin/model/slot.ts.listAllPhotoSlots()` is extended:
the hardcoded `kind: "master", id: "violetta"` entry is replaced by a loop
over `listAllMasters()` that pushes one slot per master row (label = EN name,
hint = `"1:1.2 portrait — master page hero"`). When the only seeded master is
Violetta, the listing is byte-identical to today.

## 6. Booking integration (Phase 2)

### 6.1 Step list

```ts
// views/booking/lib/booking-steps.ts
export const BOOKING_STEPS = ["service", "master", "date", "time", "confirm"] as const;
```

Bumped to 5 steps. Adjust step-index helpers accordingly; existing tests
cover the prev/next sequence.

### 6.2 Auto-skip rule

Implemented in `app/[locale]/booking/[step]/page.tsx` (server component):

```ts
if (step === "master") {
  const eligible = await loadEligibleMastersForService(bookingState.serviceId, locale);
  if (eligible.length === 1) {
    // server-side preselect + redirect to next step
    return redirect({ href: `/booking/date?master=${eligible[0].id}`, locale });
  }
}
```

The client store's `setMaster` is invoked from the query param on landing at
the next step. If the user manually navigates back, the redirect logic runs
again — no infinite loop because the page only fires when `step === "master"`.

If `eligible.length === 0` we treat it as a soft error (the service
shouldn't have been reachable; orphan hiding catches this upstream). The
master step shows "no masters available — pick a different service" with a
back link. This is defense in depth.

### 6.3 Master step UI

`views/booking/ui/steps/master-step.tsx`:

- Eligible masters rendered as portrait cards (photo + name + role + years
  badge), 1-column on phone, 2-column at sm. Selection sets
  `booking-store.masterId`.
- "Next" button disabled until a master is picked.
- Back goes to the service step.

### 6.4 Booking store

```ts
// views/booking/model/booking-store.ts
masterId: string | null;
setMaster: (id: string | null) => void;
reset: () => set({ serviceId: null, masterId: null, date: null, time: null });
```

Persisted in localStorage. Cleared whenever `serviceId` changes (since the
eligible-masters set may shift).

### 6.5 Submit & validation

`views/booking/api/submit.ts`:

- Reads `masterId` from the store payload.
- Server-side: looks up `loadEligibleMastersForService(serviceId)`.
- If exactly 1 eligible master, ignore client's submitted masterId and use
  the server-derived one (avoids client tampering).
- If ≥2 eligible, require `masterId ∈ eligible`. Reject otherwise.
- Insert booking row with `master_id`.

### 6.6 Admin bookings list

`views/admin-bookings` adds a "Master" column. Master name is locale-resolved
via the active admin locale; archived masters are rendered with a strikethrough
to flag historical references.

### 6.7 Calendar invite (Google Calendar)

The existing GCal sync (`features/google-calendar/api/...`) gains the master
name in the event title (e.g. "Signature gel · Violetta"). One-line tweak in
the event-formatter; no schema change.

## 7. Public `/master` page (Phase 1)

`/master` becomes a routing fork driven by published-master count:

- **count === 1**: render existing `MasterPage` hero for that single master.
  No URL change, no list step. Byte-identical to today.
- **count >= 2**: render a list of master cards (portrait + name + role +
  years). Each card links to `/master/[slug]`.

New dynamic route `app/[locale]/master/[slug]/page.tsx` renders the
single-hero layout for the named master. 404s on unknown slug or non-published
status.

Home `master-strip` section keeps linking to `/master` — the page handles
the count-based fork internally.

## 8. i18n

Two new namespaces, plus updates to existing ones:

- `AdminMasters` — editor labels, list section headers, archive guard
  messages (`master_has_upcoming_bookings`), status badges, specialty
  fieldset captions.
- `BookingMaster` — step title, "Choose your master" copy, "Select to
  continue" hint, "No masters available" fallback.
- `Master` (existing) — already used by the single-master hero; kept as-is.
- `Admin.dashboard.inbox_masters` + caption keys for the inbox tile.

EN/RU/BE all required on every text field — mirrors services. RU/BE seed
strings ship in the same migration that creates the table, with the EN copy
as the source of truth.

## 9. Edge cases

- **Last published master archived**: archive guard counts upcoming bookings
  globally, not per-service. As long as no upcoming bookings reference the
  master, archive proceeds. The site then has zero published masters → the
  service catalog shows zero services (every one is orphaned). Admin sees a
  banner on `/admin/services` warning the menu is empty.
- **A category with no published+masters services**: hidden from the public
  menu (since every service in it is orphaned). Admin still sees it.
- **Master added with zero specialties**: legal state. The master appears on
  `/master` but is never offered at booking until they get ≥1 service. The
  editor warns inline: "no specialties — this master can't take bookings."
- **Booking submitted while a master is mid-archive**: race condition. The
  archive transaction holds a row lock; submit's eligibility re-check happens
  inside the same DB read. Worst case the customer sees a "master no longer
  available" error and is redirected to the master step.
- **Existing bookings with `master_id IS NULL`**: only happens for bookings
  created before Phase 2's backfill. Admin list renders them with "—" in the
  Master column. We don't retro-assign.

## 10. Testing

### 10.1 Unit
- `entities/master/model/schema.test.ts` — Zod accept/reject grid for every
  field including the specialties array cap.
- `entities/master/api/load.test.ts` — locale resolution, eligible-masters
  helper, empty-DB fallback.
- `db/masters.test.ts` — missing-table guard, ordering by sort_order.
- `db/masters-mutations.test.ts` — archive guard rejects with active
  bookings, reorder is atomic.
- `features/masters-admin/api/actions.test.ts` — server action smoke
  (create + update + archive paths).

### 10.2 Component (Storybook + Vitest)
- `features/masters-admin/ui/master-editor.stories.tsx`
- `features/masters-admin/ui/master-editor.test.tsx` — slug frozen on edit,
  inline validation, specialties tick state.
- `features/masters-admin/ui/specialty-picker.test.tsx`
- `features/masters-admin/ui/admin-masters-list.test.tsx`
- `views/booking/ui/steps/master-step.test.tsx` — eligible-only list, select
  + Next behaviour.

### 10.3 E2E
- `e2e/admin-masters.spec.ts` — `test.skip(Boolean(env.TELEGRAM_BOT_TOKEN))`
  guard (matches `vip-request.spec.ts`).
  - List renders Published + Archived groups.
  - "New master" navigates to the editor.
  - Editor surfaces a validation error on blanked-RU bio.
- `e2e/booking-flow.spec.ts` — extend:
  - With 1 master in DB, the master step auto-skips (URL goes directly to
    `/booking/date`).
  - With 2 masters seeded, the master step appears between service and
    date; selecting a master enables "Next".

CI: e2e job already provisions Postgres + runs `npm run db:migrate` (added
in PR #44). The new migrations land in the same migration directory; no CI
workflow changes needed.

## 11. Phasing

### Phase 1 — Lift-and-shift + admin CRUD

- DB schema (masters + master_services)
- Migration `0008` + seed (Violetta + her current services)
- Read pipeline (`db/masters.ts`, `entities/master/`)
- Orphan-service hiding in `listPublishedServices()`
- Admin list + editor + specialty picker + archive guard
- `/admin/masters` route + inbox tile
- `/master` page: count-based fork (single hero vs list)
- `/master/[slug]` dynamic route
- Photo slot wiring (replace hardcoded `violetta` slot with per-master loop)
- Lift `master-strip` home section onto DB loader
- Drop `STUDIO_DATA.artist` once no consumer references it

Phase 1 ships independently — the customer site can show multiple masters
publicly even before they're bookable. Bookings keep their current
master-agnostic shape.

### Phase 2 — Booking integration

- Migration `0009`: `bookings.master_id` column + index + backfill
- New `master` booking step
- Auto-skip logic in `[locale]/booking/[step]/page.tsx`
- `booking-store.masterId` + reset wiring
- Submit validation + masterId persistence
- Admin bookings list — new Master column
- GCal event title includes master name
- E2E: auto-skip path + 2-master path

## 12. Out of scope (revisit later)

- Per-master availability calendars (master_availability table).
- Per-master pricing overrides.
- Customer-facing reviews / ratings.
- Service-step filtering by selected master (today the order is service →
  master; flipping the order is a UX research question for a later phase).
- Bulk-import or CSV editor for masters.
