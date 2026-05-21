# Admin services & categories management — design

**Date:** 2026-05-22
**Status:** Approved (brainstorming)
**Phasing:** Two phases — Phase 1 lift-and-shift (DB becomes source of truth, customer UX unchanged), Phase 2 admin CRUD UI + currency selector.

## 1. Goal

Move the studio's service menu from the hardcoded constant in
[entities/studio/model/data.ts](../../entities/studio/model/data.ts) into the
database, so the admin can add, edit, archive and reorder categories and
services in all three locales (en / ru / be) without a code change. The admin
can also pick the site-wide display currency (EUR / USD / BYN / RUB).

Today the menu is rendered from a static array of six `Service` objects with a
typed `Category` union of four values; category labels are translated via
`messages/{locale}.json` `Services.category.*`. After this change the menu is
rendered from `services` and `service_categories` tables. The customer-visible
menu must look identical the moment Phase 1 ships.

## 2. Non-goals

- **FX conversion / multi-currency price storage.** Currency is a display
  label only. Switching currency changes the symbol/formatting; the stored
  number is unchanged. Admin is responsible for re-entering prices if they
  want different numbers per currency.
- **Customer-side currency picker.** Currency is admin-controlled, site-wide.
- **Per-locale slugs.** A single English-rooted slug is used in URLs across
  all locales (matches today's `/services/signature`).
- **Editing the `hero` token.** Dropped from the model — photo (or palette
  gradient fallback) is the hero.
- **Translation-quality tooling / machine translation.** Admin types each
  locale by hand; all three are required at save time.
- **Audit log of admin edits** beyond `updated_at` / `updated_by` on each row.
- **Destructive schema changes.** No `DROP COLUMN`, no `DROP TABLE`. The
  retired `site_settings.price_overrides` column stays in the database
  (unused) so this design is non-destructive to existing data. Same for the
  now-unused `Services.category.*` keys in `messages/*.json` — left in place.

## 3. Schema

Two new tables and one new enum column on `site_settings`, all added in a
single Drizzle migration. **Additive only** — no drops.

### 3.1 Enums

```ts
export const serviceStatus = pgEnum("service_status", [
  "draft", "published", "archived",
]);

export const currencyCode = pgEnum("currency_code", [
  "EUR", "USD", "BYN", "RUB",
]);
```

### 3.2 `service_categories`

```ts
export const serviceCategories = pgTable(
  "service_categories",
  {
    id: text("id").primaryKey(),            // slug, e.g. "care"
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    nameBe: text("name_be").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: serviceStatus("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (t) => ({
    sortIdx: index("service_categories_sort_idx").on(t.sortOrder),
    statusIdx: index("service_categories_status_idx").on(t.status),
  }),
);
```

### 3.3 `services`

```ts
export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),            // slug, e.g. "signature-manicure"
    categoryId: text("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "restrict" }),
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    nameBe: text("name_be").notNull(),
    blurbEn: text("blurb_en").notNull(),
    blurbRu: text("blurb_ru").notNull(),
    blurbBe: text("blurb_be").notNull(),
    includes: jsonb("includes")
      .$type<Array<{ en: string; ru: string; be: string }>>()
      .notNull().default([]),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: serviceStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (t) => ({
    categoryIdx: index("services_category_idx").on(t.categoryId),
    sortIdx: index("services_sort_idx").on(t.sortOrder),
    statusIdx: index("services_status_idx").on(t.status),
    includesMax8: check(
      "services_includes_max_8",
      sql`jsonb_array_length(${t.includes}) <= 8`,
    ),
    pricePositive: check(
      "services_price_non_negative",
      sql`${t.priceCents} >= 0`,
    ),
    durationPositive: check(
      "services_duration_positive",
      sql`${t.durationMinutes} > 0`,
    ),
  }),
);
```

`services.id` is the same string used in `bookings.service_id` (text, no FK by
design — see [db/schema.ts](../../db/schema.ts) booking-table comment).
Archiving a service therefore never breaks historical bookings.

### 3.4 `site_settings.currency`

```ts
// added column on the existing singleton row
currency: currencyCode("currency").notNull().default("EUR"),
```

### 3.5 Photo binding (no schema change)

Service photos continue to use the existing `studio_photos` table with
`slot_kind = 'service'` and `slot_id = services.id`. The unique
`(slot_kind, slot_id)` index already enforces "one photo per service".

## 4. Migration & seed (Phase 1)

Single Drizzle migration:

1. Create `service_status` and `currency_code` enums.
2. Create `service_categories`, `services` (with checks + indexes).
3. `ALTER TABLE site_settings ADD COLUMN currency currency_code NOT NULL DEFAULT 'EUR'`.
4. **Seed** in the same migration (idempotent `ON CONFLICT (id) DO NOTHING`):
   - 4 categories with `sort_order` 1–4, `status='published'`:
     - `care` — EN "Care", RU "Уход", BE "Догляд"
     - `gel` — EN "Gel", RU "Гель", BE "Гель"
     - `design` — EN "Design", RU "Дизайн", BE "Дызайн"
     - `form` — EN "Form", RU "Форма", BE "Форма"
   - 6 services with `status='published'`, `sort_order` 1–6 in current array
     order, names/blurbs/includes/price/duration sourced from
     [entities/studio/model/data.ts](../../entities/studio/model/data.ts).
     `priceCents = price * 100`. `durationMinutes` parsed from the existing
     `"75 min"` / `"120 min"` strings.

Bullets (`includes`) currently exist only in English in the static data.
RU/BE translations for each bullet must be authored as part of the seed —
this is called out as a discrete task in the implementation plan and must
land before Phase 1 merges (per the "all locales required" rule).

## 5. Architecture (FSD)

### 5.1 Phase 1 — reads

```
db/services.ts                       — pure DB queries (no locale logic):
                                        listPublishedServices, listAllServices,
                                        getServiceById, listPublishedCategories,
                                        listAllCategories
entities/service/api/load.ts         — server-only loader:
                                        loadServicesForLocale(locale) → Service[]
                                        (joins studio_photos, picks
                                         name_<locale>/blurb_<locale>/category
                                         .name_<locale>, applies global
                                         discount, formats currency at the
                                         render boundary)
entities/service/model/types.ts      — runtime Service type used by UI;
                                        Category becomes { id, name } instead
                                        of the "Care"|"Gel"|… union
entities/studio/model/data.ts        — `services` and category exports removed
                                        from STUDIO_DATA; everything else
                                        (artist, gallery, testimonials,
                                        membership, profile, visits,
                                        atelierClips, studio) stays
```

Consumers switched to the loader:

- [views/services-catalog/](../../views/services-catalog/) — page + category chips
- [views/service-detail/](../../views/service-detail/)
- [views/home/](../../views/home/) — Signatures strip
- [views/booking/](../../views/booking/) — service-pick step
- [widgets/booking-stepper/](../../widgets/booking-stepper/) wherever the service list is referenced
- Any other `STUDIO_DATA.services` references (verify via grep in plan-out)

All consumers are server components today and stay server components. Where a
client child needs the data it receives it as props.

### 5.2 Phase 2 — writes

```
features/services-admin/
  ui/category-editor.tsx
  ui/service-editor.tsx
  ui/sortable-list.tsx               — dnd-kit wrapper
  model/actions.ts                   — server actions:
                                        createCategory, updateCategory,
                                        archiveCategory, restoreCategory,
                                        createService, updateService,
                                        archiveService, restoreService,
                                        reorderCategories, reorderServices

app/[locale]/admin/services/
  page.tsx                           — list view (categories + services)
  [id]/page.tsx                      — single-service editor
  categories/[id]/page.tsx           — single-category editor

features/site-settings-admin/        — gains a Currency row in Phase 2
```

The existing `/admin/photos` "Service rituals" section becomes driven by the
DB service list (a one-line change in its loader) and links each row to
`/admin/services/<id>` for full editing. The photo upload slot itself is
also embedded inline in `/admin/services/<id>` for convenience.

## 6. Read pipeline (Phase 1 detail)

`loadServicesForLocale(locale)`:

1. Query `services` where `status = 'published'`, joined to
   `service_categories` (also `status = 'published'`) and a `LEFT JOIN` on
   `studio_photos` where `slot_kind = 'service' AND slot_id = services.id`.
   Order by `services.sort_order ASC`.
2. For each row, pick `name_<locale>` / `blurb_<locale>` and the category's
   `name_<locale>`.
3. Pick the localized bullet from each `includes[i]` object.
4. Apply discount: `discounted = discountActive ? Math.round(priceCents *
   (100 - discountPercent) / 100) : priceCents`.
5. Format display price with
   `Intl.NumberFormat(locale, { style: "currency", currency: settings.currency,
   maximumFractionDigits: 0 })` (the menu shows `€95`, not `€95.00`).
6. Format display duration with a tiny per-locale helper (`{n} min` /
   `{n} мин` / `{n} хв`).

`site_settings` is loaded once per request via the existing
`loadSiteSettings()`; no extra round-trip.

## 7. Admin UX (Phase 2 detail)

### 7.1 `/admin/services` (list)

Two stacked drag-reorder sections:

```
Categories                                   [+ New category]
  ⠿ Care    · 3 services  · published   ✎  archive
  ⠿ Gel     · 1 service   · published   ✎  archive
  ⠿ Design  · 1 service   · draft       ✎  archive
  ⠿ Form    · 1 service   · published   ✎  archive

Services                                     [+ New service]
  ⠿ Signature Manicure   €95  · Care · 75m · published   ✎  archive
  ⠿ Couture Gel          €145 · Gel  · 120m· published   ✎  archive
  …
  ⠿ Glass Extensions     €240 · Form · 180m· archived    ✎  restore
```

`⠿` is a drag handle (dnd-kit, sortable preset). Drop = optimistic state
update + server action persisting the full `sort_order` ladder. Section
header rows show counts per status.

### 7.2 `/admin/services/[id]` (service editor)

Vertical form sections:

- **Identity** — slug (editable on first save, frozen + read-only after; UI
  hint explains why), category dropdown (only `published` categories),
  status select (draft / published / archived).
- **Names** — three side-by-side inputs `EN / RU / BE`, all required (HTML5
  `required` + server validation).
- **Blurb** — three side-by-side textareas, all required.
- **Includes** — ordered list, "+ Add bullet" up to 8. Each row is three
  inline inputs (EN / RU / BE). Drag handle to reorder bullets; trash to
  remove.
- **Pricing** — single number input (in major units, e.g. `95.00`; persisted
  as `priceCents`). Duration in minutes (integer).
- **Photo** — one upload slot rendered inline via the existing
  `features/photo-upload-admin` component
  (`slotKind="service"`, `slotId=<service.id>`).

Submit: server action, optimistic toast, validation errors inline.

### 7.3 `/admin/services/categories/[id]` (category editor)

- Slug (frozen after first save).
- Three name inputs (EN / RU / BE), all required.
- Status select (draft / published / archived). Sort order is set via drag
  in the list, not edited here.

Archive is blocked at the server action when any non-archived service
references this category — surfaced as an inline error listing the blocking
services with edit links.

### 7.4 `/admin/site-settings` — Currency row

A new section under the existing Palette / Locale rows: a single dropdown of
EUR / USD / BYN / RUB, saved through the existing
`features/site-settings-admin` action.

## 8. i18n approach

- Each translatable field exists as three columns: `_en`, `_ru`, `_be`,
  all `NOT NULL`. No fallback chain — a `NOT NULL` column makes "all locales
  required" a database invariant, not a UI rule the admin can route around.
- The loader picks the locale's column at the database boundary. No locale
  fallback in render code.
- Admin UI uses a new `AdminServices.*` namespace per locale (added to
  `messages/en.json` / `ru.json` / `be.json`). The old
  `Services.category.Care/Gel/Design/Form` keys stay in the messages files
  (unused, harmless) per the no-destructive-change rule.

## 9. Validation rules

Enforced at both the server-action layer and the database (defense in
depth):

| Field | Rule | DB enforcement |
|-------|------|----------------|
| `services.includes` length | ≤ 8 | `CHECK jsonb_array_length(includes) <= 8` |
| `services.price_cents` | ≥ 0 | `CHECK price_cents >= 0` |
| `services.duration_minutes` | > 0 | `CHECK duration_minutes > 0` |
| `services.{name,blurb}_{en,ru,be}` | non-empty | `NOT NULL` (server action rejects empty strings before insert) |
| `service_categories.name_{en,ru,be}` | non-empty | `NOT NULL` (server action rejects empty strings before insert) |
| `services.category_id` | references existing category | `FK ON DELETE RESTRICT` |
| Archive a category | no non-archived service references it | server action check (no DB constraint) |
| Slug | matches `/^[a-z0-9-]+$/` and is unique | PK + Zod check in server action |

## 10. Authorization

All Phase 2 server actions reuse the existing admin gate from
`features/site-settings-admin` / `features/photo-upload-admin`:
`requireAdmin(session)` throws 403 unless `users.role = 'admin'`. The
public read loader is unauthenticated and only returns `status='published'`
rows.

## 11. Testing

### Phase 1 (must include)

- `db/services.test.ts` — CRUD round-trip, ordering by `sort_order`,
  archived-filtering, FK `RESTRICT` on category delete, the three CHECK
  constraints.
- `entities/service/api/load.test.ts` — locale selection (en/ru/be),
  discount math (`discountActive=true/false`), photo join (with / without a
  matching `studio_photos` row), category filtering when category is not
  published.
- Existing services-catalog / service-detail / booking / home tests stay
  green after consumer rewrites. Where they relied on `STUDIO_DATA.services`
  they switch to mocking the loader.
- Currency formatting fixture: same `priceCents` rendered in each of EUR /
  USD / BYN / RUB across en / ru / be.

### Phase 2 (must include)

- `db/services.test.ts` — admin write paths (insert / update / archive /
  restore / reorder).
- `features/services-admin/model/actions.test.ts` — auth (non-admin
  rejected), validation (empty locale, slug collision, > 8 bullets, archive
  category with attached services), happy paths.
- Storybook stories for `category-editor`, `service-editor`,
  `sortable-list` (per project skill `new-ui-component`).
- Playwright e2e: admin signs in → creates category → creates service in
  all three locales → uploads photo → drag-reorders → archives → confirms
  customer menu (`/en/services`, `/ru/services`, `/be/services`) reflects
  changes.

### Verification gate

Before merge, both phases run `npm run lint && npm test && npm run build &&
npm run e2e` per the `verification-before-completion` skill.

## 12. Phasing & rollout

**Phase 1 — lift-and-shift** (one PR):

1. Schema migration + seed.
2. New `db/services.ts` and `entities/service/api/load.ts`.
3. Consumer rewrites (services-catalog, service-detail, home,
   booking, etc.).
4. Remove `services` + `Category` from `STUDIO_DATA`.
5. Tests as listed above.
6. Customer-visible site is **byte-identical** in en (the only fully-seeded
   locale before this change) and now also fully translated in ru/be (new).

**Phase 2 — admin UI** (separate PR, follows Phase 1):

1. `features/services-admin/` with editor components + actions.
2. `app/[locale]/admin/services/` routes (list + service editor +
   category editor).
3. `/admin/site-settings` Currency row.
4. `/admin/photos` "Service rituals" section becomes DB-driven and links
   to `/admin/services/<id>`.
5. Tests as listed above.

If Phase 2 slips, Phase 1 stands on its own — the customer-facing menu
runs from the DB seed indefinitely.

## 13. Open questions

None. All decisions captured above are locked in via the brainstorming
session on 2026-05-22.
