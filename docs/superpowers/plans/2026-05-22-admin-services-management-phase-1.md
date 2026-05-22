# Admin Services & Categories Management — Phase 1 (lift-and-shift) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the studio service menu from a hardcoded TypeScript array (`STUDIO_DATA.services`) into the database, with per-locale (en/ru/be) names/blurbs/includes, an additive currency column on `site_settings`, and seed data that makes the customer-facing site **byte-identical in `en` and now also fully translated in `ru`/`be`** the moment Phase 1 ships. Phase 2 (admin CRUD UI) is **out of scope** for this plan.

**Architecture:** Two new Drizzle tables (`service_categories`, `services`) and a `currency` column on `site_settings` (all additive — no DROPs). One server-only loader (`entities/service/api/load.ts`) replaces the static `STUDIO_DATA.services` everywhere; consumers (catalog page, service detail, home signatures, booking flow, admin pages, sitemap, slots route) switch to it. The `Service` runtime type used by UI components moves to `entities/service/model/types.ts`. `Service.category` becomes `{ id, name }` (instead of the `"Care"|"Gel"|…` union); a new `priceCents` + `displayPrice` pair replaces hardcoded `€` symbols so the global currency setting works.

**Tech Stack:** Next.js 16 App Router · React 19 · Drizzle ORM (`drizzle-kit` for migrations, `postgres-js`) · Postgres (Supabase) · next-intl (en/ru/be) · Vitest + Testing Library · TypeScript strict.

**Spec:** [docs/superpowers/specs/2026-05-22-admin-services-management-design.md](../specs/2026-05-22-admin-services-management-design.md). This plan implements §3 (schema), §4 (migration & seed), §5.1 (Phase 1 reads), §6 (read pipeline), §11 (Phase 1 tests), §12 (Phase 1 rollout), plus §3.4 (currency column). Phase 2 (§5.2, §7, §11 Phase-2 tests) is **deferred**.

**Working tree:** the user has authorized executing this on the current branch (`feature/admin-photo-upload`). No worktree split is required; commits go directly to that branch and the PR opens against `main`.

---

## File Structure

### Created in Phase 1

| File | Responsibility |
|---|---|
| `db/migrations/0007_admin_services.sql` | Drizzle-generated migration (will be edited to append the seed inserts in Task 2). |
| `db/services.ts` | Pure DB query helpers (no locale logic, no formatting). Parallels [db/site-settings.ts](../../db/site-settings.ts). |
| `db/services.test.ts` | Schema-shape contract tests, mirroring [db/site-settings.test.ts](../../db/site-settings.test.ts). |
| `entities/service/model/types.ts` | Runtime `Service` and `ServiceCategoryRef` types used by UI components. |
| `entities/service/api/load.ts` | `server-only` loader: `loadServicesForLocale(locale)`, `loadServiceByIdForLocale(id, locale)`, `loadCategoriesForLocale(locale)`. Joins photos, picks locale columns, applies discount, formats currency. |
| `entities/service/api/load.test.ts` | Loader behaviour tests (locale picking, discount math, currency formatting, photo join). |
| `entities/service/api/format-currency.ts` | Pure helper: `formatMajorAmount({ amountCents, currency, locale })` → `string` via `Intl.NumberFormat`. |
| `entities/service/api/format-currency.test.ts` | Round-trip formatting tests across `locale × currency`. |

### Modified in Phase 1

| File | Change |
|---|---|
| `db/schema.ts` | Add `serviceStatus` enum, `currencyCode` enum, `serviceCategories` table, `services` table, `currency` column on `siteSettings`, exported types. |
| `db/schema.test.ts` | Cover the new enums + table types. |
| `entities/studio/model/types.ts` | Remove `Service` and `Category` (moved to `entities/service/model/types.ts`). Other types stay. |
| `entities/studio/model/data.ts` | Remove `services: Service[]` from `STUDIO_DATA` (the array literal and the import). Other content stays. |
| `entities/studio/model/data.test.ts` | Remove any assertions that touch `STUDIO_DATA.services`. |
| `entities/studio/index.ts` | Drop the `Service` and `Category` re-exports. |
| `entities/studio/api/load-with-photos.ts` | Delete `loadServicesWithPhotos` + `loadServiceWithPhoto` (replaced by `entities/service/api/load.ts`). Other loaders stay. |
| `entities/service/index.ts` | Re-export `Service`, `ServiceCategoryRef` from the new `model/types.ts`. |
| `entities/service/ui/service-card.tsx` | Import `Service` from the new location. Read category name via `service.category.name`. Replace `€${service.price}` with `service.displayPrice`. |
| `entities/service/ui/service-card.test.tsx` | Drop `STUDIO_DATA.services[0]`; use an inline `sample` fixture. |
| `entities/service/ui/service-card.stories.tsx` | Same fixture move. |
| `entities/service/ui/service-menu-item.tsx` | Same edits as service-card (category, displayPrice). |
| `entities/service/ui/service-menu-item.test.tsx` | Inline fixture. |
| `entities/service/ui/service-menu-item.stories.tsx` | Inline fixture. |
| `shared/ui/price/ui/price.tsx` | Accept `currency: CurrencyCode` + `locale: Locale` props; format `resolved.effective` and `resolved.base` via `formatMajorAmount`. |
| `shared/ui/price/ui/price.test.tsx` | Update tests for new props. |
| `shared/ui/price/ui/price.stories.tsx` | Pass `currency="EUR"` + `locale="en"` defaults. |
| `views/services-catalog/ui/services-catalog-page.tsx` | Drop static `CATEGORIES` and `Services.category.*` lookups; derive chips from loader output; filter by `categoryId`. |
| `views/services-catalog/ui/services-catalog-page.test.tsx` | Update for new props shape. |
| `views/service-detail/ui/service-detail-page.tsx` | Drop `STUDIO_DATA.services.findIndex` — `sortOrder` comes in on the row. |
| `views/home/ui/sections/signatures-list.tsx` | Switch to `loadServicesForLocale(locale).slice(0, 4)`. |
| `views/booking/ui/steps/service-step.tsx` | Take `services` prop, render from it. |
| `views/booking/ui/steps/confirm-step.tsx` | Take `services` prop, look up by id. |
| `views/booking/ui/booking-page.tsx` | Forward a `services` prop into the child steps. |
| `views/booking/api/submit.ts` | Read `service.durationMinutes` from the DB loader (drop the regex). |
| `views/confirmation/ui/confirmation-page.tsx` | Accept the selected service as a prop. |
| `app/[locale]/services/page.tsx` | Call `loadServicesForLocale(locale)`. |
| `app/[locale]/services/[id]/page.tsx` | Call `loadServiceByIdForLocale(id, locale)`; `generateStaticParams` reads ids from the DB (or empty array when `db === null`). |
| `app/[locale]/booking/[step]/page.tsx` | Use the new loader; pass services down. |
| `app/[locale]/admin/site-settings/page.tsx` | Pull the services list via the new loader (still needed for the "Service prices" override card, which Phase 2 will remove). |
| `app/[locale]/admin/bookings/page.tsx` | Replace `STUDIO_DATA.services.find` with the new loader. |
| `app/api/booking/slots/route.ts` | Replace regex-on-duration with `service.durationMinutes`. |
| `app/sitemap.ts` | Service paths from the loader (or empty when `db === null`). |
| `features/photo-upload-admin/model/slot.ts` | Service slots from the loader; signature becomes `async` and consumers await it. |

### Touched only by re-export chain (no functional change)

These imports may need updating if VS Code auto-imported `Service` from `@/entities/studio` — switch to `@/entities/service`. Grep at the end of Task 3 catches any stragglers.

---

## Test-driven discipline

Every code task follows red → green → commit:

1. Write or update a Vitest file with a failing assertion.
2. Run the focused test and confirm it fails for the right reason.
3. Write the minimal production code.
4. Run the test, confirm it passes.
5. Commit (the project's Husky pre-commit hook runs `lint` + the full vitest suite — `feature-scoped tests` is not enough, the whole suite must stay green).

Schema migrations and seed SQL are the one exception (no meaningful "failing test" exists for a migration file). For those, the test is the **schema-shape** Vitest assertion in `db/services.test.ts` and the production proof is that `npm run db:migrate` would apply cleanly (verified by running `npx drizzle-kit check`).

---

## Task 1: Schema (Drizzle types + generated migration shell)

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/schema.test.ts`
- Create (via `npm run db:generate`): `db/migrations/0007_*.sql`

- [ ] **Step 1: Write the failing schema test**

Append to `db/schema.test.ts`:

```ts
import {
  currencyCode,
  serviceCategories,
  serviceStatus,
  services,
} from "./schema";
import type {
  NewService,
  NewServiceCategory,
  Service,
  ServiceCategoryRow,
} from "./schema";

describe("db/schema — services", () => {
  it("declares the two services tables and two new enums", () => {
    expect(serviceCategories).toBeDefined();
    expect(services).toBeDefined();
    expect(serviceStatus.enumValues).toEqual(["draft", "published", "archived"]);
    expect(currencyCode.enumValues).toEqual(["EUR", "USD", "BYN", "RUB"]);
  });

  it("infers Service / ServiceCategoryRow Insert types with required i18n columns", () => {
    const _cat: NewServiceCategory = {
      id: "care",
      nameEn: "Care",
      nameRu: "Уход",
      nameBe: "Догляд",
    };
    const _svc: NewService = {
      id: "signature",
      categoryId: "care",
      nameEn: "Signature Manicure",
      nameRu: "Сигнатурный маникюр",
      nameBe: "Сігнатурны манікюр",
      blurbEn: "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
      blurbRu: "Русская сухая техника, работа с кутикулой, ритуал увлажнения и финишный блеск.",
      blurbBe: "Расейская сухая тэхніка, праца з кутыкулай, рытуал увільгатнення і фініш-бляск.",
      includes: [],
      priceCents: 9500,
      durationMinutes: 75,
    };
    const _sel: Pick<Service, "id" | "status" | "sortOrder" | "createdAt"> = {
      id: "signature",
      status: "published",
      sortOrder: 1,
      createdAt: new Date(),
    };
    const _selCat: Pick<ServiceCategoryRow, "id" | "status" | "sortOrder"> = {
      id: "care",
      status: "published",
      sortOrder: 1,
    };
    expect(_cat.id).toBe("care");
    expect(_svc.priceCents).toBe(9500);
    expect(_sel.status).toBe("published");
    expect(_selCat.status).toBe("published");
  });
});
```

- [ ] **Step 2: Run schema test to verify it fails**

Run: `npx vitest run db/schema.test.ts -t "services"`
Expected: FAIL with "serviceCategories is not exported" / type errors on `NewService`, `NewServiceCategory`, etc.

- [ ] **Step 3: Add the enums, tables, and exported types in `db/schema.ts`**

Append after `studioPhotos` (do **not** rewrite the file — only add). The exact code:

```ts
/**
 * Lifecycle states for services and service categories. `draft` and
 * `archived` are admin-only; only `published` rows are visible on the
 * public menu. See docs/superpowers/specs/2026-05-22-admin-services-management-design.md §3.
 */
export const serviceStatus = pgEnum("service_status", [
  "draft",
  "published",
  "archived",
]);

/**
 * The site-wide display currency lives as a single value on the
 * `site_settings` singleton (column added in this same migration).
 * Currency is a display label — no FX conversion. See spec §2 / §3.4.
 */
export const currencyCode = pgEnum("currency_code", [
  "EUR",
  "USD",
  "BYN",
  "RUB",
]);

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: text("id").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    nameBe: text("name_be").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: serviceStatus("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    sortIdx: index("service_categories_sort_idx").on(table.sortOrder),
    statusIdx: index("service_categories_status_idx").on(table.status),
  }),
);

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
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
      .notNull()
      .default([]),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: serviceStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    categoryIdx: index("services_category_idx").on(table.categoryId),
    sortIdx: index("services_sort_idx").on(table.sortOrder),
    statusIdx: index("services_status_idx").on(table.status),
    includesMax8: check(
      "services_includes_max_8",
      sql`jsonb_array_length(${table.includes}) <= 8`,
    ),
    pricePositive: check(
      "services_price_non_negative",
      sql`${table.priceCents} >= 0`,
    ),
    durationPositive: check(
      "services_duration_positive",
      sql`${table.durationMinutes} > 0`,
    ),
  }),
);

export type ServiceCategoryRow = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceStatus = (typeof serviceStatus.enumValues)[number];
export type CurrencyCode = (typeof currencyCode.enumValues)[number];
```

Also extend the existing `siteSettings` table definition: add the new column **inside the existing object literal** so the columns hash differs and Drizzle picks it up. Find:

```ts
discountActive: boolean("discount_active").notNull().default(false),
```

and add immediately **after** it (still inside the columns object, before `updatedAt`):

```ts
currency: currencyCode("currency").notNull().default("EUR"),
```

- [ ] **Step 4: Run schema test to verify it passes**

Run: `npx vitest run db/schema.test.ts`
Expected: PASS for both the new tests and the existing ones.

- [ ] **Step 5: Generate the SQL migration**

Run: `npm run db:generate`
Expected: A new file `db/migrations/0007_*.sql` (drizzle-kit picks the random name; rename it to `0007_admin_services.sql` for clarity — keep the leading number unchanged so meta files line up).

```bash
# rename for readability
mv db/migrations/0007_*.sql db/migrations/0007_admin_services.sql
```

Verify the generated SQL contains:
- `CREATE TYPE "public"."service_status" AS ENUM ('draft', 'published', 'archived');`
- `CREATE TYPE "public"."currency_code" AS ENUM ('EUR', 'USD', 'BYN', 'RUB');`
- `CREATE TABLE "service_categories" (...)`
- `CREATE TABLE "services" (...)` with the three CHECK constraints
- `ALTER TABLE "site_settings" ADD COLUMN "currency" "currency_code" DEFAULT 'EUR' NOT NULL;`
- Three indexes per new table

Also check `db/migrations/meta/_journal.json` was updated to include the new migration.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts db/schema.test.ts db/migrations/
git commit -m "feat(db): services + categories tables, currency on site_settings

Adds two new tables and an enum-typed currency column on site_settings,
all additive (no DROPs). Phase 1 of the admin services management spec.
Schema-shape vitest assertions cover the new columns; the SQL migration
will be augmented with seed inserts in the next commit."
```

---

## Task 2: Seed migration (categories + 6 services in all three locales)

**Files:**
- Modify: `db/migrations/0007_admin_services.sql` (append seed inserts)
- Create: `db/migrations/0007_admin_services.test.ts` (light parse-the-SQL test)

- [ ] **Step 1: Write the seed-content test (RED)**

Create `db/migrations/0007_admin_services.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SQL = readFileSync(
  join(__dirname, "0007_admin_services.sql"),
  "utf8",
);

describe("0007_admin_services.sql", () => {
  it("seeds the four legacy categories", () => {
    for (const id of ["care", "gel", "design", "form"]) {
      expect(SQL).toMatch(new RegExp(`INSERT INTO "service_categories"[\\s\\S]+'${id}'`));
    }
    // ru/be names from messages/{ru,be}.json
    expect(SQL).toContain("'Уход'");
    expect(SQL).toContain("'Догляд'");
    expect(SQL).toContain("'Дизайн'");
    expect(SQL).toContain("'Дызайн'");
  });

  it("seeds the six legacy services with price_cents and duration_minutes", () => {
    const ids = [
      "signature",
      "gel",
      "editorial",
      "extensions",
      "pedi",
      "removal",
    ];
    for (const id of ids) {
      expect(SQL).toMatch(new RegExp(`INSERT INTO "services"[\\s\\S]+'${id}'`));
    }
    // Spot-check a couple of price/duration translations:
    // signature: €95 → 9500; "75 min" → 75
    expect(SQL).toContain("9500");
    expect(SQL).toContain("75");
    // editorial: €195 → 19500; "150 min" → 150
    expect(SQL).toContain("19500");
    expect(SQL).toContain("150");
  });

  it("uses ON CONFLICT DO NOTHING so the migration is idempotent", () => {
    const onConflictCount = (SQL.match(/ON CONFLICT/g) ?? []).length;
    // 4 categories + 6 services = at least 10 ON CONFLICT clauses
    // (or one ON CONFLICT for a batched VALUES list — accept ≥ 2).
    expect(onConflictCount).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run the seed test to verify it fails**

Run: `npx vitest run db/migrations/0007_admin_services.test.ts`
Expected: FAIL — none of the `INSERT INTO` lines are present yet (the file only contains the `CREATE TABLE` / `ALTER TABLE` output from drizzle-kit).

- [ ] **Step 3: Append the seed SQL**

Append to the END of `db/migrations/0007_admin_services.sql` (after the drizzle-generated statements, separated by `--> statement-breakpoint`):

```sql
--> statement-breakpoint
-- Seed: four legacy categories (sort order matches the historic Care/Gel/Design/Form order in entities/studio/model/data.ts).
INSERT INTO "service_categories" ("id", "name_en", "name_ru", "name_be", "sort_order", "status")
VALUES
  ('care',   'Care',   'Уход',   'Догляд', 1, 'published'),
  ('gel',    'Gel',    'Гель',   'Гель',   2, 'published'),
  ('design', 'Design', 'Дизайн', 'Дызайн', 3, 'published'),
  ('form',   'Form',   'Форма',  'Форма',  4, 'published')
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
-- Seed: six legacy services. RU/BE strings authored from the existing
-- translation style in messages/{ru,be}.json; bullet translations are
-- inline and may be tightened by Violetta before launch.
INSERT INTO "services" (
  "id", "category_id",
  "name_en", "name_ru", "name_be",
  "blurb_en", "blurb_ru", "blurb_be",
  "includes",
  "price_cents", "duration_minutes",
  "sort_order", "status"
) VALUES
  (
    'signature', 'care',
    'Signature Manicure',
    'Сигнатурный маникюр',
    'Сігнатурны манікюр',
    'Russian dry technique, cuticle work, hydration ritual & gloss finish.',
    'Русская сухая техника, работа с кутикулой, ритуал увлажнения и финишный блеск.',
    'Расейская сухая тэхніка, праца з кутыкулай, рытуал увільгатнення і фініш-бляск.',
    '[
      {"en":"Hand soak in rose & milk","ru":"Ванночка с розой и молоком","be":"Ванначка з ружай і малаком"},
      {"en":"Russian e-file manicure","ru":"Аппаратный маникюр","be":"Апаратны манікюр"},
      {"en":"Cuticle reconstruction","ru":"Восстановление кутикулы","be":"Аднаўленне кутыкулы"},
      {"en":"Bespoke gloss","ru":"Авторский блеск","be":"Аўтарскі бляск"}
    ]'::jsonb,
    9500, 75,
    1, 'published'
  ),
  (
    'gel', 'gel',
    'Couture Gel',
    'Кутюр-гель',
    'Кутюр-гель',
    'Long-wear Japanese gel in a single tone or a curated nude palette.',
    'Долговечный японский гель в одном тоне или подобранной нюдовой палитре.',
    'Доўгатрывалы японскі гель у адным тоне або падабранай нюдавай палітры.',
    '[
      {"en":"Signature prep","ru":"Сигнатурная подготовка","be":"Сігнатурная падрыхтоўка"},
      {"en":"Japanese gel application","ru":"Нанесение японского геля","be":"Нанясенне японскага гелю"},
      {"en":"Edge sculpt & shape","ru":"Скульптура и форма края","be":"Скульптура і форма края"},
      {"en":"Two-week guarantee","ru":"Гарантия две недели","be":"Гарантыя два тыдні"}
    ]'::jsonb,
    14500, 120,
    2, 'published'
  ),
  (
    'editorial', 'design',
    'Editorial Art',
    'Эдиториал-арт',
    'Эдыторыял-арт',
    'Bespoke nail design — chrome, lace, hand-painted miniatures.',
    'Авторский нейл-дизайн — хром, кружево, ручная роспись.',
    'Аўтарскі нэйл-дызайн — хром, карункі, ручны роспіс.',
    '[
      {"en":"Mood consultation","ru":"Консультация по настроению","be":"Кансультацыя па настроі"},
      {"en":"Hand-painted artwork","ru":"Ручная роспись","be":"Ручны роспіс"},
      {"en":"3D detailing on request","ru":"3D-детали по запросу","be":"3D-дэталі на запыт"},
      {"en":"Photography of the set","ru":"Фотосъёмка сета","be":"Фотаздымка сэта"}
    ]'::jsonb,
    19500, 150,
    3, 'published'
  ),
  (
    'extensions', 'form',
    'Glass Extensions',
    'Стеклянное наращивание',
    'Шкляное нарошчванне',
    'Sculpted soft-gel extensions in glass, almond or ballerina silhouettes.',
    'Скульптурное наращивание мягким гелем — стекло, миндаль, балерина.',
    'Скульптурнае нарошчванне мяккім гелем — шкло, мігдал, балерына.',
    '[
      {"en":"Form sculpting","ru":"Лепка формы","be":"Ляпленне формы"},
      {"en":"Architectural shape","ru":"Архитектурная форма","be":"Архітэктурная форма"},
      {"en":"Strength layer","ru":"Слой прочности","be":"Слой моцы"},
      {"en":"Mirror buff & seal","ru":"Зеркальная полировка и герметизация","be":"Люстраная паліроўка і герметызацыя"}
    ]'::jsonb,
    24000, 180,
    4, 'published'
  ),
  (
    'pedi', 'care',
    'Spa Pedicure',
    'Спа-педикюр',
    'Спа-педыкюр',
    'Foot bath in violet salts, gentle exfoliation and lacquered finish.',
    'Ванна для ног с фиалковой солью, мягкая эксфолиация и финиш с лаком.',
    'Ванна для ног з фіялкавай соллю, мяккая эксфаліяцыя і фініш з лакам.',
    '[
      {"en":"Violet salt bath","ru":"Ванна с фиалковой солью","be":"Ванна з фіялкавай соллю"},
      {"en":"Heel restoration","ru":"Восстановление пяток","be":"Аднаўленне пятак"},
      {"en":"Massage with cassis oil","ru":"Массаж с маслом смородины","be":"Масаж з алеем парэчкі"},
      {"en":"Lacquer or gel finish","ru":"Финиш лаком или гелем","be":"Фініш лакам або гелем"}
    ]'::jsonb,
    11000, 90,
    5, 'published'
  ),
  (
    'removal', 'care',
    'Gentle Removal',
    'Бережное снятие',
    'Беражлівае зняцце',
    'Soak-off, nail rehab and a single coat of strengthener.',
    'Деликатное снятие, восстановление ногтей и один слой укрепителя.',
    'Далікатнае зняцце, аднаўленне пазногцяў і адзін слой умацавальніка.',
    '[
      {"en":"Soak-off","ru":"Размачивание","be":"Размочванне"},
      {"en":"Nail rehab","ru":"Восстановление ногтей","be":"Аднаўленне пазногцяў"},
      {"en":"Strengthener","ru":"Укрепитель","be":"Умацавальнік"},
      {"en":"Cuticle oil","ru":"Масло для кутикулы","be":"Алей для кутыкулы"}
    ]'::jsonb,
    4000, 45,
    6, 'published'
  )
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2b: Run the seed test to verify it passes**

Run: `npx vitest run db/migrations/0007_admin_services.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add db/migrations/
git commit -m "feat(db): seed legacy categories + services in en/ru/be

Idempotent ON CONFLICT seed of the four historic categories
(care/gel/design/form) and the six legacy services with EN, RU, and BE
copies of name/blurb/includes. RU/BE strings written from the existing
messages/{ru,be}.json style and may be tightened by Violetta later."
```

---

## Task 3: db/services.ts (query layer)

**Files:**
- Create: `db/services.ts`
- Create: `db/services.test.ts`

- [ ] **Step 1: Write the failing query-shape test**

Create `db/services.test.ts` modelled on `db/site-settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  listAllCategories,
  listAllServices,
  listPublishedCategories,
  listPublishedServices,
  getServiceById,
} from "./services";

describe("db/services", () => {
  it("returns array shapes even when DATABASE_URL is unset", async () => {
    // db === null path (CI / local dev with no DATABASE_URL). All listers
    // should return [] without throwing.
    let services: unknown[] = [];
    let categories: unknown[] = [];
    let publishedServices: unknown[] = [];
    let publishedCategories: unknown[] = [];
    let one: unknown = "unset";
    try {
      services = await listAllServices();
      categories = await listAllCategories();
      publishedServices = await listPublishedServices();
      publishedCategories = await listPublishedCategories();
      one = await getServiceById("does-not-exist");
    } catch {
      // Real DB reachable but migration not applied — also acceptable.
    }
    expect(Array.isArray(services)).toBe(true);
    expect(Array.isArray(categories)).toBe(true);
    expect(Array.isArray(publishedServices)).toBe(true);
    expect(Array.isArray(publishedCategories)).toBe(true);
    expect(one === null || (typeof one === "object" && one !== null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run db/services.test.ts`
Expected: FAIL — `Cannot find module './services'`.

- [ ] **Step 3: Implement `db/services.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB queries for services + categories. No locale logic, no price
 * formatting — those belong to `entities/service/api/load.ts`. Returns
 * empty arrays when DATABASE_URL is unset so the build / CI / local dev
 * keep working without the DB.
 *
 * Also tolerant of the table not having been migrated yet (42P01 =
 * undefined_table) — mirrors the posture in `db/studio-photos.ts`.
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

export async function listAllServices(): Promise<schema.Service[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.services)
      .orderBy(schema.services.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listPublishedServices(): Promise<schema.Service[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.status, "published"))
      .orderBy(schema.services.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getServiceById(
  id: string,
): Promise<schema.Service | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function listAllCategories(): Promise<schema.ServiceCategoryRow[]> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.serviceCategories)
      .orderBy(schema.serviceCategories.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listPublishedCategories(): Promise<
  schema.ServiceCategoryRow[]
> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.serviceCategories)
      .where(eq(schema.serviceCategories.status, "published"))
      .orderBy(schema.serviceCategories.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run db/services.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add db/services.ts db/services.test.ts
git commit -m "feat(db): listPublishedServices + getServiceById + categories

Pure DB queries that mirror db/site-settings.ts and db/studio-photos.ts —
db-null + missing-table tolerance, sortOrder ordering, status filtering."
```

---

## Task 4: format-currency helper (pure)

**Files:**
- Create: `entities/service/api/format-currency.ts`
- Create: `entities/service/api/format-currency.test.ts`

- [ ] **Step 1: Write the failing test**

Create `entities/service/api/format-currency.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatMajorAmount } from "./format-currency";

describe("formatMajorAmount", () => {
  it("formats EUR for en with a leading symbol and no fraction digits", () => {
    expect(formatMajorAmount({ amountCents: 9500, currency: "EUR", locale: "en" }))
      .toBe("€95");
  });

  it("formats USD for en with a leading $ sign", () => {
    expect(formatMajorAmount({ amountCents: 9500, currency: "USD", locale: "en" }))
      .toBe("$95");
  });

  it("formats BYN for be — trailing symbol", () => {
    // ICU output for be-BY + BYN puts the symbol after the number.
    const result = formatMajorAmount({
      amountCents: 9500,
      currency: "BYN",
      locale: "be",
    });
    expect(result).toMatch(/95[\s  ]*Br/);
  });

  it("formats RUB for ru — trailing ruble sign", () => {
    const result = formatMajorAmount({
      amountCents: 9500,
      currency: "RUB",
      locale: "ru",
    });
    expect(result).toMatch(/95[\s  ]*₽/);
  });

  it("rounds half-cents up — 9550 cents → €96 in EUR/en with max 0 fraction", () => {
    // Math.round(95.5) = 96
    expect(formatMajorAmount({ amountCents: 9550, currency: "EUR", locale: "en" }))
      .toBe("€96");
  });

  it("returns '€0' for zero amount in EUR/en", () => {
    expect(formatMajorAmount({ amountCents: 0, currency: "EUR", locale: "en" }))
      .toBe("€0");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run entities/service/api/format-currency.test.ts`
Expected: FAIL — `Cannot find module './format-currency'`.

- [ ] **Step 3: Implement the helper**

Create `entities/service/api/format-currency.ts`:

```ts
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

export interface FormatMajorAmountInput {
  amountCents: number;
  currency: CurrencyCode;
  locale: Locale;
}

/**
 * Formats an integer-minor-units amount (e.g. 9500 cents → €95) using
 * the runtime's Intl.NumberFormat for the given locale + currency.
 *
 * The menu shows whole units — `maximumFractionDigits: 0`. ICU picks the
 * symbol position per locale × currency (leading "€95" / "$95" in en,
 * trailing "95 Br" / "95 ₽" in be/ru). The spec accepts this divergence
 * by design — see §6 step 5 in
 * docs/superpowers/specs/2026-05-22-admin-services-management-design.md.
 */
export function formatMajorAmount({
  amountCents,
  currency,
  locale,
}: FormatMajorAmountInput): string {
  const major = Math.round(amountCents / 100);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(major);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run entities/service/api/format-currency.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add entities/service/api/format-currency.ts entities/service/api/format-currency.test.ts
git commit -m "feat(service): formatMajorAmount — Intl.NumberFormat by locale × currency"
```

---

## Task 5: entities/service/model/types.ts + studio cleanup

**Files:**
- Create: `entities/service/model/types.ts`
- Modify: `entities/studio/model/types.ts` (remove `Category` and `Service`)
- Modify: `entities/studio/model/data.ts` (remove `services`)
- Modify: `entities/studio/model/data.test.ts` (drop services assertions)
- Modify: `entities/studio/index.ts` (drop the two re-exports)
- Modify: `entities/service/index.ts` (re-export the new types)

After this task the codebase **will not compile** — that's expected; subsequent tasks fix each consumer. We avoid an in-between "shim" type that would just duplicate work. Run the **service-card unit test first** to confirm what's expected to break.

- [ ] **Step 1: Create `entities/service/model/types.ts`**

```ts
import type { CurrencyCode } from "@/db/schema";
import type { ImageAsset } from "@/entities/studio";

/**
 * Runtime category reference attached to each loaded Service. Only `id`
 * and a locale-resolved `name` are exposed to UI — the full row stays in
 * the DB layer.
 */
export interface ServiceCategoryRef {
  id: string;
  name: string;
}

/**
 * Runtime Service shape used by every UI component. Built by
 * `entities/service/api/load.ts` for the active locale; UI never looks
 * up locale columns directly.
 *
 * - `price` is a major-units number kept for back-compat with snapshot
 *   tests that read `service.price`. Tests can rely on it.
 * - `priceCents` is the canonical integer-minor-units amount.
 * - `displayPrice` is the pre-formatted string — what every "€95" used
 *   to be. Consumers SHOULD prefer `displayPrice` over `price` so the
 *   global currency setting applies.
 * - `duration` is the localized display string (e.g. "75 min" /
 *   "75 мин" / "75 хв"). `durationMinutes` is the integer used by
 *   booking submit + the slots route.
 * - `includes` is the locale-resolved bullet list.
 */
export interface Service {
  id: string;
  category: ServiceCategoryRef;
  name: string;
  blurb: string;
  includes: string[];
  price: number;
  priceCents: number;
  displayPrice: string;
  duration: string;
  durationMinutes: number;
  sortOrder: number;
  image?: ImageAsset;
}

export type { CurrencyCode };
```

- [ ] **Step 2: Update `entities/service/index.ts`**

Replace its contents with:

```ts
export { ServiceCard } from "./ui/service-card";
export type { ServiceCardProps } from "./ui/service-card";
export { ServiceMenuItem } from "./ui/service-menu-item";
export type { ServiceMenuItemProps } from "./ui/service-menu-item";
export type { Service, ServiceCategoryRef } from "./model/types";
```

- [ ] **Step 3: Trim `entities/studio/model/types.ts`**

Delete the `Category` type alias (line 1) and the `Service` interface (lines 29–40). Leave everything else.

Replace `service: Service[]` references in the file — there are none after deleting `Service`, but the import in `data.ts` will break, which is fine.

- [ ] **Step 4: Trim `entities/studio/model/data.ts`**

Delete:
- The `Service,` line from the `import type { … } from "./types"` block.
- The `services: Service[] = [...]` array literal in full (lines 32–123).
- The `services,` line from the `STUDIO_DATA` const.

The rest of the file (artist, gallery, testimonials, membership, profile, visits, atelierClips, studio) stays.

- [ ] **Step 5: Trim `entities/studio/index.ts`**

Replace the file with:

```ts
export { STUDIO_DATA } from "./model/data";
export type {
  Artist,
  AtelierClip,
  AtelierClipKey,
  CustomerProfile,
  GalleryItem,
  GalleryTag,
  ImageAsset,
  MembershipTier,
  StudioInfo,
  Testimonial,
  VideoAsset,
  Visit,
  VisitStatus,
} from "./model/types";
```

(Drops `Category` and `Service`.)

- [ ] **Step 6: Trim `entities/studio/model/data.test.ts`**

Open the file and remove any assertion that references `STUDIO_DATA.services` or types the file imports from this slice. If after removing those the file has no `describe` body left, delete the empty `describe` so vitest doesn't complain.

- [ ] **Step 7: Verify the type errors are only the expected ones**

Run: `npm run lint -- --max-warnings 0` and `npx tsc --noEmit`
Expected: errors point at the files listed in the "Modified" section above. **Do not fix them yet** — subsequent tasks fix them one at a time. The point of this step is to confirm no surprise breakage in unrelated files.

- [ ] **Step 8: Commit**

```bash
git add entities/service/ entities/studio/
git commit -m "refactor(service): move Service/Category types into entities/service

Moves the runtime Service shape out of entities/studio (where it lived
alongside studio-wide data like artist / gallery) into the dedicated
entities/service slice. STUDIO_DATA.services is removed in favour of the
DB-backed loader landing in the next commits. This commit intentionally
breaks consumer imports — they are fixed in subsequent task commits."
```

---

## Task 6: entities/service/api/load.ts (server-only loader)

**Files:**
- Create: `entities/service/api/load.ts`
- Create: `entities/service/api/load.test.ts`

- [ ] **Step 1: Write the failing loader test**

Create `entities/service/api/load.test.ts`. The DB is null in CI; we exercise the pure transformation by injecting fake `rows` through an exported `_toService` helper. The full DB-attached path is exercised by the existing happy-path integration (e2e) — fine for Phase 1.

```ts
import { describe, expect, it } from "vitest";
import { _toService } from "./load";
import type { Service as DbService, ServiceCategoryRow } from "@/db/schema";
import type { SiteSettings } from "@/entities/site-settings";

const baseSettings: SiteSettings = {
  defaultPalette: "aubergine",
  defaultLocale: "en",
  priceOverrides: {},
  discountPercent: 0,
  discountActive: false,
  updatedAt: new Date(0).toISOString(),
};

const dbCare: ServiceCategoryRow = {
  id: "care",
  nameEn: "Care",
  nameRu: "Уход",
  nameBe: "Догляд",
  sortOrder: 1,
  status: "published",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  updatedBy: null,
};

const dbSignature: DbService = {
  id: "signature",
  categoryId: "care",
  nameEn: "Signature Manicure",
  nameRu: "Сигнатурный маникюр",
  nameBe: "Сігнатурны манікюр",
  blurbEn: "EN blurb",
  blurbRu: "RU blurb",
  blurbBe: "BE blurb",
  includes: [
    { en: "Soak", ru: "Ванна", be: "Ванна" },
    { en: "File", ru: "Опил", be: "Апіл" },
  ],
  priceCents: 9500,
  durationMinutes: 75,
  sortOrder: 1,
  status: "published",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  updatedBy: null,
};

describe("_toService", () => {
  it("picks the en columns for locale=en and formats EUR", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "en",
      currency: "EUR",
      settings: { ...baseSettings, currency: "EUR" } as SiteSettings & {
        currency: "EUR";
      },
    });
    expect(s.name).toBe("Signature Manicure");
    expect(s.blurb).toBe("EN blurb");
    expect(s.category).toEqual({ id: "care", name: "Care" });
    expect(s.includes).toEqual(["Soak", "File"]);
    expect(s.price).toBe(95);
    expect(s.priceCents).toBe(9500);
    expect(s.displayPrice).toBe("€95");
    expect(s.duration).toBe("75 min");
    expect(s.durationMinutes).toBe(75);
    expect(s.sortOrder).toBe(1);
  });

  it("picks the ru columns and formats the ru duration label", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "ru",
      currency: "EUR",
      settings: { ...baseSettings, currency: "EUR" } as SiteSettings & {
        currency: "EUR";
      },
    });
    expect(s.name).toBe("Сигнатурный маникюр");
    expect(s.category.name).toBe("Уход");
    expect(s.includes).toEqual(["Ванна", "Опил"]);
    expect(s.duration).toBe("75 мин");
  });

  it("picks be columns and formats be duration", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "be",
      currency: "EUR",
      settings: { ...baseSettings, currency: "EUR" } as SiteSettings & {
        currency: "EUR";
      },
    });
    expect(s.name).toBe("Сігнатурны манікюр");
    expect(s.category.name).toBe("Догляд");
    expect(s.includes).toEqual(["Ванна", "Апіл"]);
    expect(s.duration).toBe("75 хв");
  });

  it("applies discountActive + discountPercent to price/displayPrice", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: null,
      locale: "en",
      currency: "EUR",
      settings: {
        ...baseSettings,
        discountActive: true,
        discountPercent: 20,
        currency: "EUR",
      } as SiteSettings & { currency: "EUR" },
    });
    // 9500 * 0.8 = 7600 cents → €76
    expect(s.priceCents).toBe(7600);
    expect(s.price).toBe(76);
    expect(s.displayPrice).toBe("€76");
  });

  it("threads the photo asset into service.image when present", () => {
    const s = _toService({
      row: dbSignature,
      category: dbCare,
      photo: {
        slotKind: "service",
        slotId: "signature",
        image: { src: "/x.jpg", width: 100, height: 120 },
        uploadedAt: new Date(0).toISOString(),
        uploadedBy: null,
      },
      locale: "en",
      currency: "EUR",
      settings: { ...baseSettings, currency: "EUR" } as SiteSettings & {
        currency: "EUR";
      },
    });
    expect(s.image?.src).toBe("/x.jpg");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run entities/service/api/load.test.ts`
Expected: FAIL — `Cannot find module './load'`.

- [ ] **Step 3: Implement the loader**

Create `entities/service/api/load.ts`. Note the `"server-only"` marker — this module imports the DB and must never be pulled into a client component or a story file. The barrel `entities/service/index.ts` does **not** re-export it.

```ts
import "server-only";
import {
  getServiceById,
  listPublishedCategories,
  listPublishedServices,
} from "@/db/services";
import type {
  CurrencyCode,
  Service as DbService,
  ServiceCategoryRow,
} from "@/db/schema";
import { getStudioPhoto, getStudioPhotos } from "@/db/studio-photos";
import type { StudioPhotoRecord } from "@/db/studio-photos";
import { getSiteSettings } from "@/db/site-settings";
import type { SiteSettings } from "@/entities/site-settings";
import { defaultLocale, type Locale } from "@/i18n/routing";
import type { Service, ServiceCategoryRef } from "../model/types";
import { formatMajorAmount } from "./format-currency";

interface SiteSettingsWithCurrency extends SiteSettings {
  currency: CurrencyCode;
}

function pickI18n<T extends { nameEn: string; nameRu: string; nameBe: string }>(
  row: T,
  locale: Locale,
  field: "name",
): string;
function pickI18n<T extends { blurbEn: string; blurbRu: string; blurbBe: string }>(
  row: T,
  locale: Locale,
  field: "blurb",
): string;
function pickI18n(row: Record<string, string>, locale: Locale, field: string): string {
  const suffix = locale === "ru" ? "Ru" : locale === "be" ? "Be" : "En";
  return row[`${field}${suffix}`]!;
}

function pickInclude(
  entry: { en: string; ru: string; be: string },
  locale: Locale,
): string {
  return entry[locale];
}

const DURATION_UNIT: Record<Locale, string> = {
  en: "min",
  ru: "мин",
  be: "хв",
};

function formatDuration(minutes: number, locale: Locale): string {
  return `${minutes} ${DURATION_UNIT[locale]}`;
}

function applyDiscount(priceCents: number, settings: SiteSettings): number {
  if (!settings.discountActive || settings.discountPercent === 0) return priceCents;
  return Math.round((priceCents * (100 - settings.discountPercent)) / 100);
}

/**
 * Pure transformation — exported under an underscore so tests can poke
 * at it without needing the DB. Production callers use the loaders
 * below, which assemble the dependencies for you.
 */
export function _toService({
  row,
  category,
  photo,
  locale,
  currency,
  settings,
}: {
  row: DbService;
  category: ServiceCategoryRow;
  photo: StudioPhotoRecord | null;
  locale: Locale;
  currency: CurrencyCode;
  settings: SiteSettings;
}): Service {
  const categoryRef: ServiceCategoryRef = {
    id: category.id,
    name: pickI18n(category, locale, "name"),
  };
  const effectiveCents = applyDiscount(row.priceCents, settings);
  return {
    id: row.id,
    category: categoryRef,
    name: pickI18n(row, locale, "name"),
    blurb: pickI18n(row, locale, "blurb"),
    includes: (row.includes ?? []).map((entry) => pickInclude(entry, locale)),
    price: Math.round(effectiveCents / 100),
    priceCents: effectiveCents,
    displayPrice: formatMajorAmount({
      amountCents: effectiveCents,
      currency,
      locale,
    }),
    duration: formatDuration(row.durationMinutes, locale),
    durationMinutes: row.durationMinutes,
    sortOrder: row.sortOrder,
    image: photo?.image,
  };
}

function asSettingsWithCurrency(
  settings: SiteSettings,
): SiteSettingsWithCurrency {
  // `getSiteSettings` returns a row that includes `currency`; but the
  // public `SiteSettings` type in entities/site-settings doesn't expose
  // it yet (that's a Phase 2 task). Narrow defensively here.
  const maybe = (settings as SiteSettings & { currency?: CurrencyCode });
  return { ...settings, currency: maybe.currency ?? "EUR" };
}

export async function loadServicesForLocale(
  locale: Locale,
): Promise<Service[]> {
  const [rows, categories, photos, rawSettings] = await Promise.all([
    listPublishedServices(),
    listPublishedCategories(),
    getStudioPhotos("service"),
    getSiteSettings(),
  ]);
  const settings = asSettingsWithCurrency(rawSettings);
  const catById = new Map<string, ServiceCategoryRow>(
    categories.map((c) => [c.id, c]),
  );
  const photoById = new Map<string, StudioPhotoRecord>(
    photos.map((p) => [p.slotId, p]),
  );
  return rows
    .map((row) => {
      const category = catById.get(row.categoryId);
      if (!category) return null;
      return _toService({
        row,
        category,
        photo: photoById.get(row.id) ?? null,
        locale,
        currency: settings.currency,
        settings,
      });
    })
    .filter((s): s is Service => s !== null);
}

export async function loadServiceByIdForLocale(
  id: string,
  locale: Locale,
): Promise<Service | null> {
  const [row, settingsRaw] = await Promise.all([
    getServiceById(id),
    getSiteSettings(),
  ]);
  if (!row || row.status !== "published") return null;
  const settings = asSettingsWithCurrency(settingsRaw);
  const categories = await listPublishedCategories();
  const category = categories.find((c) => c.id === row.categoryId);
  if (!category) return null;
  const photo = await getStudioPhoto("service", id);
  return _toService({
    row,
    category,
    photo,
    locale,
    currency: settings.currency,
    settings,
  });
}

export async function loadPublishedServiceIds(): Promise<string[]> {
  const rows = await listPublishedServices();
  return rows.map((r) => r.id);
}

export const _defaultLocale: Locale = defaultLocale;
```

- [ ] **Step 4: Run the loader test to verify it passes**

Run: `npx vitest run entities/service/api/load.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add entities/service/api/load.ts entities/service/api/load.test.ts entities/service/model/types.ts
git commit -m "feat(service): loadServicesForLocale joins photos + applies currency

Server-only loader picks name_<locale>/blurb_<locale>/category.name_<locale>
columns, applies the global discount, formats price via Intl.NumberFormat,
and threads in the matching studio_photos row. The pure _toService helper
is exported under an underscore so tests can exercise it without a DB."
```

---

## Task 7: Update the `Price` component to format by `currency × locale`

**Files:**
- Modify: `shared/ui/price/ui/price.tsx`
- Modify: `shared/ui/price/ui/price.test.tsx`
- Modify: `shared/ui/price/ui/price.stories.tsx`

The Price component currently hardcodes `€`. After this task it accepts `currency` + `locale` and uses `formatMajorAmount`. The `ResolvedPrice.base` / `.effective` values stay numbers in major units — Price multiplies by 100 internally before formatting.

- [ ] **Step 1: Update the test (RED)**

Replace `shared/ui/price/ui/price.test.tsx` with:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Price } from "./price";

describe("Price", () => {
  it("renders the effective price formatted as EUR/en by default", () => {
    render(
      <Price
        resolved={{ base: 95, effective: 95, hasDiscount: false }}
        currency="EUR"
        locale="en"
      />,
    );
    expect(screen.getByText("€95")).toBeInTheDocument();
  });

  it("renders both the effective and base prices when discounted", () => {
    render(
      <Price
        resolved={{ base: 95, effective: 76, hasDiscount: true }}
        currency="EUR"
        locale="en"
      />,
    );
    expect(screen.getByText("€76")).toBeInTheDocument();
    expect(screen.getByText("€95")).toBeInTheDocument();
  });

  it("renders the free label when the effective price is 0 and a label is given", () => {
    render(
      <Price
        resolved={{ base: 0, effective: 0, hasDiscount: false }}
        currency="EUR"
        locale="en"
        freeLabel="Free"
      />,
    );
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("formats RUB / ru as a trailing ₽", () => {
    render(
      <Price
        resolved={{ base: 95, effective: 95, hasDiscount: false }}
        currency="RUB"
        locale="ru"
      />,
    );
    expect(screen.getByText(/95[\s  ]*₽/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run shared/ui/price/ui/price.test.tsx`
Expected: FAIL — Price doesn't accept `currency` / `locale` yet.

- [ ] **Step 3: Update `price.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { CurrencyCode } from "@/db/schema";
import { formatMajorAmount } from "@/entities/service/api/format-currency";
import type { Locale } from "@/i18n/routing";

export interface PriceProps extends HTMLAttributes<HTMLSpanElement> {
  resolved: ResolvedPrice;
  currency: CurrencyCode;
  locale: Locale;
  freeLabel?: string;
}

export function Price({
  resolved,
  currency,
  locale,
  freeLabel,
  className,
  ...rest
}: PriceProps) {
  if (resolved.effective === 0 && freeLabel) {
    return (
      <span className={className} {...rest}>
        {freeLabel}
      </span>
    );
  }
  const effective = formatMajorAmount({
    amountCents: resolved.effective * 100,
    currency,
    locale,
  });
  const base = formatMajorAmount({
    amountCents: resolved.base * 100,
    currency,
    locale,
  });
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5", className)}
      {...rest}
    >
      <span>{effective}</span>
      {resolved.hasDiscount ? (
        <s className="font-mono text-[11px] text-text-3">{base}</s>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 4: Update `price.stories.tsx`**

Each story now needs `currency="EUR"` and `locale="en"` args (or whatever the story demonstrates). Read the existing file and add the args to every story export.

- [ ] **Step 5: Run the test + storybook unit to verify they pass**

Run: `npx vitest run shared/ui/price/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/ui/price/
git commit -m "feat(price): format by currency × locale via Intl.NumberFormat

Drops the hardcoded € symbol — Price now takes currency + locale props
and reuses formatMajorAmount. Every callsite must pass these; consumer
updates land in subsequent commits."
```

---

## Task 8: Update `entities/service/ui` (service-card + service-menu-item)

**Files:**
- Modify: `entities/service/ui/service-card.tsx`
- Modify: `entities/service/ui/service-card.test.tsx`
- Modify: `entities/service/ui/service-card.stories.tsx`
- Modify: `entities/service/ui/service-menu-item.tsx`
- Modify: `entities/service/ui/service-menu-item.test.tsx`
- Modify: `entities/service/ui/service-menu-item.stories.tsx`

- [ ] **Step 1: Replace fixtures in the tests (RED)**

`entities/service/ui/service-card.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceCard } from "./service-card";
import type { Service } from "../model/types";

const sample: Service = {
  id: "signature",
  category: { id: "care", name: "Care" },
  name: "Signature Manicure",
  blurb: "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
  includes: [],
  price: 95,
  priceCents: 9500,
  displayPrice: "€95",
  duration: "75 min",
  durationMinutes: 75,
  sortOrder: 1,
};

describe("ServiceCard", () => {
  it("renders the service name, blurb, duration, and displayPrice", () => {
    render(<ServiceCard service={sample} />);
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
    expect(screen.getByText(sample.blurb)).toBeInTheDocument();
    expect(screen.getByText("75 min")).toBeInTheDocument();
    expect(screen.getByText("€95")).toBeInTheDocument();
  });

  it("adds the top rule border when topRule is true", () => {
    const { container } = render(<ServiceCard service={sample} topRule />);
    expect(container.firstChild).toHaveClass("border-t-line-strong");
  });

  it("omits the top rule border by default", () => {
    const { container } = render(<ServiceCard service={sample} />);
    expect(container.firstChild).not.toHaveClass("border-t-line-strong");
  });

  it("merges incoming className with internal layout classes", () => {
    const { container } = render(
      <ServiceCard service={sample} className="opacity-50" />,
    );
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(container.firstChild).toHaveClass("flex");
  });
});
```

`entities/service/ui/service-menu-item.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceMenuItem } from "./service-menu-item";
import type { Service } from "../model/types";

const sample: Service = {
  id: "signature",
  category: { id: "care", name: "Care" },
  name: "Signature Manicure",
  blurb: "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
  includes: [],
  price: 95,
  priceCents: 9500,
  displayPrice: "€95",
  duration: "75 min",
  durationMinutes: 75,
  sortOrder: 1,
};

describe("ServiceMenuItem", () => {
  it("renders the service name, duration, category, blurb, and price", () => {
    render(<ServiceMenuItem service={sample} plateNumber={1} />);
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
    expect(screen.getByText(/75 min.*Care/)).toBeInTheDocument();
    expect(screen.getByText(sample.blurb)).toBeInTheDocument();
    expect(screen.getByText("€95")).toBeInTheDocument();
  });

  it("zero-pads the plate number to two digits", () => {
    const { rerender } = render(
      <ServiceMenuItem service={sample} plateNumber={2} />,
    );
    expect(screen.getByText("02")).toBeInTheDocument();
    rerender(<ServiceMenuItem service={sample} plateNumber={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("opts into a top rule via the topRule prop", () => {
    const { container } = render(
      <ServiceMenuItem service={sample} plateNumber={1} topRule />,
    );
    expect(container.firstChild).toHaveClass("border-t-[0.5px]");
  });
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npx vitest run entities/service/ui/`
Expected: FAIL — type errors on `service.category` (object vs string), `service.displayPrice` not yet rendered.

- [ ] **Step 3: Update `service-card.tsx`**

Replace the import block at the top:
```ts
import type { Service } from "../model/types";
```
(remove `import type { Service } from "@/entities/studio";`)

In the JSX, replace:
```tsx
{resolvedPrice ? (
  <Price resolved={resolvedPrice} />
) : (
  <>€{service.price}</>
)}
```
with:
```tsx
{resolvedPrice ? (
  <Price resolved={resolvedPrice} currency={currency} locale={locale} />
) : (
  service.displayPrice
)}
```

Add `currency` + `locale` to `ServiceCardProps`:
```ts
import type { CurrencyCode } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
…
export interface ServiceCardProps extends HTMLAttributes<HTMLDivElement> {
  service: Service;
  variant?: NailTileVariant;
  topRule?: boolean;
  palette?: readonly [string, string];
  resolvedPrice?: ResolvedPrice;
  currency?: CurrencyCode;
  locale?: Locale;
}
```
Default them in the props: `currency = "EUR"`, `locale = "en"`. The default keeps the existing `<ServiceCard service={sample} />` tests/stories working.

- [ ] **Step 4: Update `service-menu-item.tsx`**

Same shape changes as service-card. Also replace `{service.duration} · {service.category}` with `{service.duration} · {service.category.name}`.

- [ ] **Step 5: Update both `.stories.tsx` files**

Replace the fixture import at the top of each:
```ts
import { STUDIO_DATA } from "@/entities/studio";
// const sample = STUDIO_DATA.services[0];
```
with the inline fixture identical to the test fixture. Stories that used `resolvedPrice` should pass `currency="EUR"`, `locale="en"`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run entities/service/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add entities/service/ui/
git commit -m "feat(service): card + menu-item consume locale-resolved Service shape

Drops STUDIO_DATA.services[0] fixtures in favour of an inline fixture that
matches the new Service runtime shape (category as { id, name }, displayPrice
as a pre-formatted string). New optional currency/locale props default to
EUR/en for stories + isolated tests."
```

---

## Task 9: Update services-catalog view + routes

**Files:**
- Modify: `views/services-catalog/ui/services-catalog-page.tsx`
- Modify: `views/services-catalog/ui/services-catalog-page.test.tsx`
- Modify: `views/services-catalog/ui/category-chips.tsx` (no behaviour change, but check for any breaking imports)
- Modify: `app/[locale]/services/page.tsx`

- [ ] **Step 1: Update the catalog-page test (RED)**

The test still mounts the page; it just needs to pass the new prop shape. Read the existing test file, then update it so `services` and `categories` are passed in. Skeleton:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServicesCatalogPage } from "./services-catalog-page";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { Service, ServiceCategoryRef } from "@/entities/service";

const categories: ServiceCategoryRef[] = [
  { id: "care", name: "Care" },
  { id: "gel", name: "Gel" },
];
const services: Service[] = [
  {
    id: "signature",
    category: categories[0]!,
    name: "Signature Manicure",
    blurb: "blurb",
    includes: [],
    price: 95,
    priceCents: 9500,
    displayPrice: "€95",
    duration: "75 min",
    durationMinutes: 75,
    sortOrder: 1,
  },
];

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ServicesCatalogPage services={services} categories={categories} />
    </NextIntlClientProvider>,
  );
}

describe("ServicesCatalogPage", () => {
  it("renders all services on the All chip", () => {
    renderPage();
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
  });

  it("renders the locale-resolved category labels in the chip strip", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: "Care" })).toBeInTheDocument();
  });
});
```

(Keep any existing assertions that still apply.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run views/services-catalog/`
Expected: FAIL — `categories` prop unknown / `service.category === active` type error.

- [ ] **Step 3: Update `services-catalog-page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServiceMenuItem } from "@/entities/service";
import type { Service, ServiceCategoryRef } from "@/entities/service";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { CurrencyCode } from "@/db/schema";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { Aurora } from "@/shared/ui/aurora";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { Plate } from "@/shared/ui/plate";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import { CategoryChips, type ChipValue } from "./category-chips";

const ALL: ChipValue = "All";

export interface ServicesCatalogPageProps {
  services: readonly Service[];
  categories: readonly ServiceCategoryRef[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
}

export function ServicesCatalogPage({
  services,
  categories,
  pricedServices,
  currency = "EUR",
}: ServicesCatalogPageProps) {
  const t = useTranslations("Services");
  const locale = useLocale();
  const [active, setActive] = useState<ChipValue>(ALL);

  const chips: readonly ChipValue[] = useMemo(
    () => [ALL, ...categories.map((c) => c.id)],
    [categories],
  );
  const labels = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = { [ALL]: t("category_all") };
    for (const c of categories) out[c.id] = c.name;
    return out;
  }, [categories, t]);

  const filtered = useMemo(
    () =>
      active === ALL
        ? services
        : services.filter((s) => s.category.id === active),
    [active, services],
  );

  return (
    <div className="pb-28">
      <AppHeader />
      <section className="relative overflow-hidden px-[22px] pb-[18px] pt-3">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <div className="relative z-10">
          <div className="flex items-end justify-between">
            <Plate folio number={0} label={t("plate_alacarte").toUpperCase()} />
            <span className="pb-2 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
              {t("plate_rituals")}
            </span>
          </div>
          <h1 className="mt-3 font-display text-h1 font-light italic leading-[0.95] tracking-[-0.025em]">
            {t("hero_title")}
          </h1>
          <LetterpressRule className="mt-3.5 max-w-[260px]" />
          <p className="dropcap mt-4 max-w-[320px] text-[14px] text-text-2">
            {t("hero_paragraph")}
          </p>
        </div>
      </section>

      <CategoryChips
        categories={chips}
        active={active}
        onChange={setActive}
        labels={labels}
        ariaLabel={t("filter_aria")}
      />

      <div className="px-[22px] pb-7 pt-[22px]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Ornament className="mx-auto max-w-[160px]" />
            <p className="mt-6 font-display text-[18px] italic text-text-2">
              {t("empty")}
            </p>
          </div>
        ) : (
          filtered.map((service, i) => (
            <SpotlightCard key={service.id} className="rounded-none">
              <Link
                href={`/services/${service.id}`}
                className="block transition-transform duration-fast ease-out"
              >
                <ServiceMenuItem
                  service={service}
                  plateNumber={i + 1}
                  variant={(i % 6) as NailTileVariant}
                  topRule={i === 0}
                  resolvedPrice={pricedServices?.[service.id]}
                  currency={currency}
                  locale={locale}
                />
              </Link>
            </SpotlightCard>
          ))
        )}
      </div>
      <TabBar />
    </div>
  );
}
```

(Note: no longer reads `Services.category.*` translation keys — the keys remain in messages files but go unused per spec §8.)

- [ ] **Step 4: Update `app/[locale]/services/page.tsx`**

```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice, type ResolvedPrice } from "@/entities/site-settings";
import {
  loadServicesForLocale,
} from "@/entities/service/api/load";
import { listPublishedCategories } from "@/db/services";
import type { ServiceCategoryRef } from "@/entities/service";
import { ServicesCatalogPage } from "@/views/services-catalog";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function ServicesRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [settings, services, categoryRows] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale as "en" | "ru" | "be"),
    listPublishedCategories(),
  ]);
  const categories: ServiceCategoryRef[] = categoryRows.map((c) => {
    const name =
      locale === "ru" ? c.nameRu : locale === "be" ? c.nameBe : c.nameEn;
    return { id: c.id, name };
  });
  const pricedServices: Record<string, ResolvedPrice> = {};
  for (const s of services) {
    pricedServices[s.id] = resolvePrice(`service:${s.id}`, s.price, settings);
  }
  return (
    <ServicesCatalogPage
      services={services}
      categories={categories}
      pricedServices={pricedServices}
      currency={(settings as { currency?: "EUR" }).currency ?? "EUR"}
    />
  );
}
```

(`resolvePrice` is still used so the existing per-service `priceOverrides` continue to influence the visible price for the "Service prices" override card in admin — until Phase 2 retires that card. This matches spec §2 "Honoring price_overrides at render time" — Phase 1 of the spec ignores them, but for backward compat in the catalog we still resolve. Actually re-read: spec §2 says **Phase 1's `loadServicesForLocale` reads only `services.price_cents` and the global discount.** So we should **not** pass `resolvePrice` results that re-apply the per-service override. Drop `pricedServices` entirely from the catalog route.)

Revised — drop the `pricedServices` calculation and prop:

```tsx
export default async function ServicesRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [settings, services, categoryRows] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale as "en" | "ru" | "be"),
    listPublishedCategories(),
  ]);
  const categories: ServiceCategoryRef[] = categoryRows.map((c) => {
    const name =
      locale === "ru" ? c.nameRu : locale === "be" ? c.nameBe : c.nameEn;
    return { id: c.id, name };
  });
  return (
    <ServicesCatalogPage
      services={services}
      categories={categories}
      currency={(settings as { currency?: "EUR" }).currency ?? "EUR"}
    />
  );
}
```

Catalog now shows the loader-produced `displayPrice` directly, with the global discount already applied by the loader.

- [ ] **Step 5: Run the catalog tests**

Run: `npx vitest run views/services-catalog/ entities/service/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add views/services-catalog/ app/\[locale\]/services/page.tsx
git commit -m "feat(catalog): drive services + categories from the DB loader

Catalog page now receives both lists from the route; chips and filter use
category.id, the discount is applied inside the loader, and currency comes
from site_settings. Static CATEGORIES array and Services.category lookups
are gone from this component."
```

---

## Task 10: Update service-detail view + route

**Files:**
- Modify: `views/service-detail/ui/service-detail-page.tsx`
- Modify: `app/[locale]/services/[id]/page.tsx`

The current page derives `plateNumber` from `STUDIO_DATA.services.findIndex` and pulls `recent = STUDIO_DATA.gallery.slice(0,3)`. The plate number now comes from `service.sortOrder`. Gallery still lives in `STUDIO_DATA.gallery` — that stays.

- [ ] **Step 1: Update `views/service-detail/ui/service-detail-page.tsx`**

Replace the imports + plate derivation:

```tsx
import { useTranslations } from "next-intl";
import type { ResolvedPrice } from "@/entities/site-settings";
import type { Service } from "@/entities/service";
import { STUDIO_DATA } from "@/entities/studio";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { AppHeader } from "@/widgets/app-header";
import { DetailDescription } from "./sections/detail-description";
import { DetailHero } from "./sections/detail-hero";
import { IncludesList } from "./sections/includes-list";
import { RecentMiniGallery } from "./sections/recent-mini-gallery";
import { StickyCta } from "./sections/sticky-cta";

export interface ServiceDetailPageProps {
  service: Service;
  resolvedPrice: ResolvedPrice;
}

const HERO_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function ServiceDetailPage({
  service,
  resolvedPrice,
}: ServiceDetailPageProps) {
  const t = useTranslations("ServiceDetail");
  const plateNumber = service.sortOrder;
  const variant = ((service.sortOrder - 1) % 6) as NailTileVariant;
  const recent = STUDIO_DATA.gallery.slice(0, 3);
  const plateTitle = `${t("plate_prefix")} · ${String(plateNumber).padStart(2, "0")}`;

  return (
    <div className="pb-24">
      <div className="relative">
        <DetailHero
          service={service}
          plateNumber={plateNumber}
          variant={variant}
          palette={HERO_PALETTE}
          durationLabel={service.duration}
          resolvedPrice={resolvedPrice}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0">
          <div className="pointer-events-auto">
            <AppHeader back="/services" title={plateTitle} />
          </div>
        </div>
      </div>
      <DetailDescription service={service} />
      <IncludesList items={service.includes} />
      <RecentMiniGallery items={recent} />
      <StickyCta serviceId={service.id} resolvedPrice={resolvedPrice} />
    </div>
  );
}
```

(`DetailHero`, `DetailDescription`, `IncludesList` etc. work off the same `Service` type — they'll pick it up through the entities/service barrel automatically once the imports are migrated.)

- [ ] **Step 2: Update `app/[locale]/services/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolvePrice } from "@/entities/site-settings";
import {
  loadPublishedServiceIds,
  loadServiceByIdForLocale,
} from "@/entities/service/api/load";
import { routing } from "@/i18n/routing";
import { ServiceDetailPage } from "@/views/service-detail";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; id: string };

export async function generateStaticParams() {
  const ids = await loadPublishedServiceIds();
  return routing.locales.flatMap((locale) =>
    ids.map((id) => ({ locale, id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const service = await loadServiceByIdForLocale(id, locale as "en" | "ru" | "be");
  if (!service) return { title: "Violetta" };
  const t = await getTranslations({ locale, namespace: "ServiceDetail" });
  return { title: `Violetta — ${service.name} · ${t("meta_subtitle")}` };
}

export default async function ServiceDetailRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const service = await loadServiceByIdForLocale(
    id,
    locale as "en" | "ru" | "be",
  );
  if (!service) notFound();
  const settings = await getSiteSettingsServer();
  const resolvedPrice = resolvePrice(`service:${service.id}`, service.price, settings);
  return <ServiceDetailPage service={service} resolvedPrice={resolvedPrice} />;
}
```

- [ ] **Step 3: Pass any failing existing tests + commit**

Run: `npx vitest run views/service-detail/`
Expected: PASS (existing detail-page tests are minimal — verify, fix any that broke).

```bash
git add views/service-detail/ app/\[locale\]/services/\[id\]/
git commit -m "feat(service-detail): drive page from DB loader; plate from sortOrder

generateStaticParams now reads the published service ids from the DB (empty
when db is null — falls back to dynamic rendering). plateNumber comes from
service.sortOrder, removing the dependency on the static services array."
```

---

## Task 11: Update home signatures + booking flow + slots route + submit

**Files:**
- Modify: `views/home/ui/sections/signatures-list.tsx`
- Modify: `views/booking/ui/booking-page.tsx`
- Modify: `views/booking/ui/steps/service-step.tsx`
- Modify: `views/booking/ui/steps/confirm-step.tsx`
- Modify: `views/booking/api/submit.ts`
- Modify: `app/api/booking/slots/route.ts`
- Modify: `app/[locale]/booking/[step]/page.tsx`
- Modify: `views/confirmation/ui/confirmation-page.tsx`

This task is large but each edit is mechanical.

- [ ] **Step 1: `signatures-list.tsx` — switch to the new loader**

```tsx
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ServiceCard } from "@/entities/service";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
// ArrowRight icon unchanged

export async function SignaturesList() {
  const [t, locale] = await Promise.all([
    getTranslations("Home"),
    getLocale(),
  ]);
  const all = await loadServicesForLocale(locale as "en" | "ru" | "be");
  const services = all.slice(0, 4);
  // … rest of the JSX unchanged, except each <ServiceCard> now receives
  // `currency={service ? "EUR" : "EUR"}` — actually pull currency from
  // settings. Easier: also call getSiteSettingsServer here and pass
  // currency down. Inline it:
  return (
    /* unchanged shell — ensure ServiceCard receives currency + locale */
    null
  );
}
```

Full implementation:

```tsx
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ServiceCard } from "@/entities/service";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import type { NailTileVariant } from "@/shared/ui/nail-tile";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export async function SignaturesList() {
  const [t, locale, settings] = await Promise.all([
    getTranslations("Home"),
    getLocale(),
    getSiteSettingsServer(),
  ]);
  const all = await loadServicesForLocale(locale as "en" | "ru" | "be");
  const services = all.slice(0, 4);
  const currency = (settings as { currency?: "EUR" }).currency ?? "EUR";
  return (
    <section className="px-[22px] pb-6 pt-12">
      <div className="mb-3 flex items-end justify-between">
        <Plate folio number={1} label={t("plate_menu").toUpperCase()} />
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent"
        >
          {t("signatures_all_link")} <ArrowRight />
        </Link>
      </div>
      <h2 className="mt-1 font-display text-h2 font-normal italic leading-[1.05] tracking-[-0.02em]">
        {t("signatures_title")}
      </h2>
      <LetterpressRule className="mb-[22px] mt-3" />
      <div className="flex flex-col">
        {services.map((service, i) => (
          <SpotlightCard key={service.id} className="rounded-none">
            <Link
              href={`/services/${service.id}`}
              className="block transition-transform duration-fast ease-out hover:scale-[1.005] motion-reduce:hover:scale-100"
            >
              <ServiceCard
                service={service}
                variant={(i % 6) as NailTileVariant}
                topRule={i === 0}
                currency={currency}
                locale={locale as "en" | "ru" | "be"}
              />
            </Link>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: `views/booking/ui/booking-page.tsx`**

Add a `services` prop and forward it to the steps:

```tsx
export interface BookingPageProps {
  step: BookingStep;
  services: readonly Service[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
  locale: Locale;
}
```

Pass the right slice into `ServiceStep` and `ConfirmStep`.

- [ ] **Step 3: `service-step.tsx` + `confirm-step.tsx`**

Switch them from `STUDIO_DATA.services` to a `services` prop. Replace `€${s.price}` with `{s.displayPrice}` in the fallback branches.

- [ ] **Step 4: `views/confirmation/ui/confirmation-page.tsx`**

Today this page tries `STUDIO_DATA.services.find((s) => s.id === serviceId) ?? STUDIO_DATA.services[0]`. Change the signature to take an optional `service: Service | null` prop and fall back to a synthetic placeholder when null. The new admin booking flow always knows the id, so the server-side caller can call the loader and pass it in.

- [ ] **Step 5: `views/booking/api/submit.ts`**

Replace the regex + `STUDIO_DATA.services.find` with `await getServiceById(input.serviceId)`. Read `durationMinutes` directly:

```ts
import { getServiceById } from "@/db/services";
// …
const service = await getServiceById(input.serviceId);
if (!service || service.status !== "published") {
  return { ok: false, error: "invalid_input" };
}
const durationMin = service.durationMinutes;
// `service.nameEn` etc — for the GCal summary, pick by locale:
const localizedName =
  input.locale === "ru" ? service.nameRu : input.locale === "be" ? service.nameBe : service.nameEn;
// …
summary: `${localizedName} · ${customerLabel}`,
```

Drop `parseDurationMin` entirely.

- [ ] **Step 6: `app/api/booking/slots/route.ts`**

Replace `STUDIO_DATA.services.find` + `parseDurationMin` with:

```ts
import { getServiceById } from "@/db/services";
// …
const service = await getServiceById(serviceId);
const durationMin = service?.durationMinutes ?? DEFAULT_DURATION_MIN;
```

- [ ] **Step 7: `app/[locale]/booking/[step]/page.tsx`**

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadServicesForLocale } from "@/entities/service/api/load";
import { resolvePrice, type ResolvedPrice } from "@/entities/site-settings";
import { routing } from "@/i18n/routing";
import {
  BookingPage,
  BOOKING_STEPS,
  isBookingStep,
} from "@/views/booking";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

type Params = { locale: string; step: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    BOOKING_STEPS.map((step) => ({ locale, step })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, step } = await params;
  if (!isBookingStep(step)) return { title: "Violetta" };
  const t = await getTranslations({ locale, namespace: "Booking" });
  return { title: `Violetta — ${t("meta_title")} · ${t(`steps.${step}`)}` };
}

export default async function BookingRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, step } = await params;
  setRequestLocale(locale);
  if (!isBookingStep(step)) notFound();
  const [settings, services] = await Promise.all([
    getSiteSettingsServer(),
    loadServicesForLocale(locale as "en" | "ru" | "be"),
  ]);
  const pricedServices: Record<string, ResolvedPrice> = {};
  for (const s of services) {
    pricedServices[s.id] = resolvePrice(`service:${s.id}`, s.price, settings);
  }
  const currency = (settings as { currency?: "EUR" }).currency ?? "EUR";
  return (
    <Suspense fallback={null}>
      <BookingPage
        step={step}
        services={services}
        pricedServices={pricedServices}
        currency={currency}
        locale={locale as "en" | "ru" | "be"}
      />
    </Suspense>
  );
}
```

- [ ] **Step 8: Run the booking-flow tests + signatures + confirmation**

Run: `npx vitest run views/booking/ views/home/ views/confirmation/`
Expected: PASS (or update fixtures in `views/booking/ui/steps/*.test.tsx` if they pin to `STUDIO_DATA.services`).

- [ ] **Step 9: Commit**

```bash
git add views/home views/booking views/confirmation app/api/booking app/\[locale\]/booking
git commit -m "feat(booking, home): drive booking + signatures from DB loader

Booking step components, submit, slots route, confirmation page, and home
signatures all switch from STUDIO_DATA.services to the DB-backed loader.
Duration is read directly as an integer instead of parsed from a string.
Service display strings come pre-formatted via service.displayPrice."
```

---

## Task 12: Update admin site-settings + admin bookings + sitemap + photo-slot

**Files:**
- Modify: `app/[locale]/admin/site-settings/page.tsx`
- Modify: `app/[locale]/admin/bookings/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `features/photo-upload-admin/model/slot.ts`
- Modify: every consumer of `listAllPhotoSlots()` (now async — grep `listAllPhotoSlots\(`)

- [ ] **Step 1: `app/[locale]/admin/site-settings/page.tsx`**

```tsx
import { listAllServices } from "@/db/services";
// inside the route:
const allServices = await listAllServices();
// pass to SiteSettingsForm in the same shape it consumed:
services={allServices.map((s) => ({
  id: s.id,
  name: s.nameEn, // admin form is English-only by current convention
  basePrice: Math.round(s.priceCents / 100),
}))}
```

(`STUDIO_DATA.services` reference removed; `STUDIO_DATA.membership` reference stays.)

- [ ] **Step 2: `app/[locale]/admin/bookings/page.tsx`**

Replace the inline `STUDIO_DATA.services.find((s) => s.id === b.serviceId)` lookup with a precomputed map at the top of the route handler:

```ts
import { listAllServices } from "@/db/services";
// in the handler:
const allServices = await listAllServices();
const serviceById = new Map(allServices.map((s) => [s.id, s]));
// later, where the JSX referenced `STUDIO_DATA.services.find(...)`:
const service = serviceById.get(b.serviceId);
const serviceName = service?.nameEn ?? b.serviceId;
```

- [ ] **Step 3: `app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { listPublishedServices } from "@/db/services";
import { routing } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://violetta.example.com";
  const PUBLIC_PATHS = [
    "/welcome",
    "/onboarding",
    "/home",
    "/services",
    "/gallery",
    "/master",
    "/membership",
    "/profile",
  ] as const;
  const services = await listPublishedServices();
  const servicePaths = services.map((s) => `/services/${s.id}`);
  const allPaths = [...PUBLIC_PATHS, ...servicePaths];
  return routing.locales.flatMap((locale) =>
    allPaths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "/welcome" || path === "/home" ? 0.9 : 0.7,
    })),
  );
}
```

(Note: the function becomes `async`. Next.js sitemap handlers support async — see the official docs in `node_modules/next/dist/docs/app/api-reference/file-conventions/metadata/sitemap.mdx`.)

- [ ] **Step 4: `features/photo-upload-admin/model/slot.ts`**

```ts
import { listAllServices } from "@/db/services";
import { STUDIO_DATA } from "@/entities/studio";
import type { PhotoSlotKind } from "@/db/schema";

// (PhotoSlotId + PhotoSlot interfaces unchanged)

export async function listAllPhotoSlots(): Promise<PhotoSlot[]> {
  const slots: PhotoSlot[] = [];
  const services = await listAllServices();
  for (const s of services) {
    slots.push({
      kind: "service",
      id: s.id,
      label: s.nameEn,
      hint: "5:6 portrait · doubles as thumb + detail hero",
    });
  }
  // gallery / testimonials / atelier / master / profile sections unchanged
  // (they still source from STUDIO_DATA — those are Phase-2/future scope).
  for (const g of STUDIO_DATA.gallery) {
    slots.push({
      kind: "gallery",
      id: g.id,
      label: `${g.tag} · ${g.id}`,
      hint: "natural ratio · grid + lightbox",
    });
  }
  for (const t of STUDIO_DATA.testimonials) {
    slots.push({
      kind: "testimonial",
      id: t.id,
      label: `${t.name} · ${t.role}`,
      hint: "1:1 · 22px disc",
    });
  }
  for (const clip of STUDIO_DATA.atelierClips) {
    slots.push({
      kind: "atelier",
      id: clip.key,
      label: `Atelier · ${clip.key}`,
      hint: "3:4 poster frame for the clip",
    });
  }
  slots.push({
    kind: "master",
    id: "violetta",
    label: STUDIO_DATA.artist.name,
    hint: "1:1.2 portrait — master page hero",
  });
  slots.push({
    kind: "profile",
    id: STUDIO_DATA.profile.name.toLowerCase().replace(/\s+/g, "-"),
    label: `${STUDIO_DATA.profile.name} · profile avatar`,
    hint: "1:1 · 68px disc",
  });
  return slots;
}
```

- [ ] **Step 5: Update every caller of `listAllPhotoSlots()`**

Grep: `rg "listAllPhotoSlots\("`. Add `await` (and `async` to the calling function if it isn't already).

- [ ] **Step 6: Run the whole vitest suite**

Run: `npm test`
Expected: PASS. Failing tests likely point to fixtures that still expect `STUDIO_DATA.services` — update them.

- [ ] **Step 7: Commit**

```bash
git add app/sitemap.ts app/\[locale\]/admin/ features/photo-upload-admin/
git commit -m "feat(admin, sitemap): drive remaining consumers from DB loader

Admin site-settings + admin bookings + sitemap + photo-upload slot list
all read services from the DB. listAllPhotoSlots is now async; all callers
updated."
```

---

## Task 13: Final sweep — delete `loadServicesWithPhotos` + `loadServiceWithPhoto`

**Files:**
- Modify: `entities/studio/api/load-with-photos.ts` (remove the two service loaders)

- [ ] **Step 1: Confirm no remaining callers**

Run: `rg "loadServicesWithPhotos|loadServiceWithPhoto" --type ts --type tsx`
Expected: zero hits in `app/`, `views/`, `widgets/`, `features/`, `entities/`. Any hit means a consumer was missed in earlier tasks — fix that consumer first.

- [ ] **Step 2: Delete the two functions**

In `entities/studio/api/load-with-photos.ts`, remove `loadServicesWithPhotos` and `loadServiceWithPhoto` along with the now-unused `Service` import. The other loaders (gallery, artist, testimonials, atelier, profile) stay.

- [ ] **Step 3: Re-run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add entities/studio/api/load-with-photos.ts
git commit -m "refactor(studio): drop service loaders superseded by entities/service/api/load"
```

---

## Task 14: Pre-merge verification gate

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: PASS (no errors, no warnings).

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: PASS (all suites, including storybook stories that mount as tests).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS — Next.js production build succeeds. SSG step for `/services/[id]` should emit pages for each seeded id × each locale (or fall back to dynamic if `DATABASE_URL` is unset in CI; that's fine).

- [ ] **Step 4: E2E**

Run: `npm run e2e`
Expected: PASS. If any e2e spec hardcodes service text (e.g. "Signature Manicure"), it should still pass because the seed preserves those names. If a spec checks `€` symbols on a non-en locale, that's a real fix — update the spec.

- [ ] **Step 5: Manual smoke**

Boot the dev server, browse `/en/services`, `/ru/services`, `/be/services`, click a service, walk through `/booking/service` → `/confirm`, confirm a booking renders the right name + price.

```bash
npm run dev
# visit http://localhost:3000/en/services in a browser
```

- [ ] **Step 6: No code changes — verification only**

Do not commit anything in this task. If a step fails, return to the relevant earlier task to fix it.

---

## Task 15: Open the PR

- [ ] **Step 1: Final status check**

```bash
git status
git log --oneline main..HEAD
```

Expected: a clean working tree and one commit per task above (10 task commits + the two spec commits already on the branch).

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feature/admin-photo-upload
```

(Branch already exists upstream; this just publishes new commits.)

- [ ] **Step 3: Open the PR via `gh`**

```bash
gh pr create --title "feat: admin services & categories management — phase 1 (lift-and-shift)" --body "$(cat <<'EOF'
## Summary
- Adds two new tables (`service_categories`, `services`) and a `currency` column on `site_settings` — all additive (no DROPs)
- Seeds the four legacy categories and six legacy services with EN/RU/BE strings; customer site is byte-identical in `en` and now also fully translated in `ru`/`be`
- New server-only loader `entities/service/api/load.ts` replaces every `STUDIO_DATA.services` reference (catalog, detail, home signatures, booking flow, admin pages, sitemap, slots route)
- `Service.category` is now `{ id, name }` (resolved per request locale); `Service` carries `priceCents`, `displayPrice` (Intl-formatted with the site currency), and `durationMinutes`
- Phase 2 (admin CRUD UI, currency selector in `/admin/site-settings`) deferred to a follow-up

## Test plan
- [ ] \`npm run lint\` clean
- [ ] \`npm test\` all suites green
- [ ] \`npm run build\` succeeds
- [ ] \`npm run e2e\` succeeds
- [ ] Manual: \`/en/services\` / \`/ru/services\` / \`/be/services\` each render six services with localized names + €-prices
- [ ] Manual: book a service end-to-end; confirmation shows the right name + duration

Spec: \`docs/superpowers/specs/2026-05-22-admin-services-management-design.md\`
Plan: \`docs/superpowers/plans/2026-05-22-admin-services-management-phase-1.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Return the PR URL**

The PR URL printed by `gh pr create` is the deliverable for the "until PR open" instruction.

---

## What this plan deliberately does NOT do

These belong to Phase 2 (separate plan after Phase 1 merges):

- Admin CRUD UI for services + categories.
- Currency selector in `/admin/site-settings`.
- Removing the "Service prices" override card from admin site-settings.
- Drag-reorder in admin.
- New `AdminServices.*` namespace in `messages/*.json`.
- E2E for admin services management.

If any of those creep into Phase 1 the PR grows past a reviewable size.
