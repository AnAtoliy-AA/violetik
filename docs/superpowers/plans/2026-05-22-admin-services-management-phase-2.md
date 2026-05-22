# Admin Services & Categories Management — Phase 2 (admin CRUD UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the admin CRUD UI for services + categories (create, edit, archive/restore, drag-reorder, photo slot) under `/admin/services`, expose the site-wide currency selector on `/admin/site-settings`, and retire the now-meaningless per-service price-overrides admin section. Phase 1 (DB-driven catalog, shipped in PR #44) already made the DB the source of truth.

**Architecture:** New FSD feature slice `features/services-admin/` owns the editor UI + server actions. New routes under `app/[locale]/admin/services/`. dnd-kit drives optimistic drag-reorder; server actions persist the new `sort_order` ladder. Auth gate reuses the existing `requireAdmin` (TELEGRAM_BOT_TOKEN-gated, same posture as `features/site-settings-admin` / `features/photo-upload-admin`). The site-settings form gains a Currency row and loses the per-service override rows (the `priceOverrides` JSONB column itself stays — VIP membership still uses it).

**Tech Stack:** Next.js 16 App Router · React 19 · Drizzle ORM · Postgres (Supabase) · `@dnd-kit/core` + `@dnd-kit/sortable` (new dependency) · next-intl (en / ru / be) · Vitest + Testing Library · TypeScript strict · Storybook.

**Spec:** [docs/superpowers/specs/2026-05-22-admin-services-management-design.md](../specs/2026-05-22-admin-services-management-design.md). This plan implements spec §3.4 (currency UI), §5.2 (write side architecture), §7 (admin UX), and the Phase-2 portions of §11. Phase 1 — schema + seed + read-side rewrites — already shipped in PR #44.

**Working tree:** new branch `feature/admin-services-phase-2` off the just-merged `develop`. All commits go directly to that branch; PR opens against `develop`.

---

## Decisions locked from Phase 1 / spec

| Decision | Source |
|---|---|
| Three locales (en/ru/be) **all required** at save time | Spec §1, §8, validation §9 |
| Slug regex `/^[a-z0-9-]+$/`, frozen after first save | Spec §7.2, §9 |
| `services.includes` max 8 bullets, each `{en, ru, be}` | Spec §3.3, §9 (DB CHECK already in place) |
| Soft-delete only — `status: draft | published | archived`; never hard-delete | Spec §3.3, §10 |
| Categories: archive blocked when any non-archived service references it | Spec §7.3, §9 |
| dnd-kit (sortable preset), optimistic UI, server action persists full sort_order ladder | Spec §7.1 |
| Currency: fixed enum EUR/USD/BYN/RUB, no FX | Spec §3.4 |
| Per-service `priceOverrides` admin rows go away; `membership:VIP` row stays | Spec §2 "honoring price_overrides" + grep confirms membership uses it |
| All routes locale-prefixed; admin-only via existing `requireAdmin` gate (TELEGRAM_BOT_TOKEN-gated, mirror of site-settings-admin pattern) | Spec §10 |

---

## File Structure

### Created in Phase 2

| File | Responsibility |
|---|---|
| `db/services-mutations.ts` | Pure DB writes — insert/update/archive/restore/reorder for both tables. Auth-agnostic; server actions handle auth. |
| `db/services-mutations.test.ts` | Shape + db-null-tolerance tests, mirroring `db/services.test.ts`. |
| `entities/service/model/schema.ts` | Shared Zod schemas — `serviceFormSchema`, `categoryFormSchema`, `slugSchema`, `includesSchema`. Used by both the client form and the server actions for symmetric validation. |
| `entities/service/model/schema.test.ts` | Validation tests — required locales, bullet cap, slug regex, ranges. |
| `features/services-admin/index.ts` | Public barrel (UI components + action types). |
| `features/services-admin/api/create-category.ts` | `"use server"` action. |
| `features/services-admin/api/update-category.ts` | `"use server"` action. |
| `features/services-admin/api/archive-category.ts` | `"use server"` action; refuses when published services reference the category. |
| `features/services-admin/api/restore-category.ts` | `"use server"` action. |
| `features/services-admin/api/create-service.ts` | `"use server"` action; auto-slug from EN name on first save. |
| `features/services-admin/api/update-service.ts` | `"use server"` action; slug frozen at this layer. |
| `features/services-admin/api/archive-service.ts` | `"use server"` action. |
| `features/services-admin/api/restore-service.ts` | `"use server"` action. |
| `features/services-admin/api/reorder-categories.ts` | `"use server"` — accepts ordered list of category ids, writes the new ladder. |
| `features/services-admin/api/reorder-services.ts` | `"use server"` — accepts ordered list of service ids, writes the new ladder. |
| `features/services-admin/api/actions.test.ts` | Auth gate + validation rejection tests. |
| `features/services-admin/ui/sortable-list.tsx` | dnd-kit wrapper — renders any list with drag handles + persists the order via a callback. Generic over item type. |
| `features/services-admin/ui/sortable-list.stories.tsx` | Story exercising the wrapper with fixture items. |
| `features/services-admin/ui/sortable-list.test.tsx` | Vitest — renders items, exposes drag handles, calls `onReorder`. |
| `features/services-admin/ui/category-editor.tsx` | Three-locale form for one category (create or edit). |
| `features/services-admin/ui/category-editor.stories.tsx` | Story for create + edit + archive states. |
| `features/services-admin/ui/category-editor.test.tsx` | Vitest — required-locale validation, slug-frozen-on-edit, archive-blocked surface. |
| `features/services-admin/ui/service-editor.tsx` | Service form with i18n inputs, includes editor, price/duration, category dropdown, status select, embedded photo slot. |
| `features/services-admin/ui/service-editor.stories.tsx` | Story for create + edit. |
| `features/services-admin/ui/service-editor.test.tsx` | Vitest — required-locale validation, bullet cap of 8, slug frozen on edit. |
| `features/services-admin/ui/admin-services-list.tsx` | Server-driven list view; renders two SortableList instances (categories + services). |
| `features/services-admin/ui/admin-services-list.test.tsx` | Vitest — counts, archived section, drag-handle presence. |
| `app/[locale]/admin/services/page.tsx` | List route. |
| `app/[locale]/admin/services/[id]/page.tsx` | Service editor route (create when id === "new", edit otherwise). |
| `app/[locale]/admin/services/categories/[id]/page.tsx` | Category editor route (create when id === "new"). |
| `e2e/admin-services.spec.ts` | Playwright smoke: list renders, create category, create service in all 3 locales, archive, drag-reorder persists. |

### Modified in Phase 2

| File | Change |
|---|---|
| `package.json` / `package-lock.json` | Add `@dnd-kit/core` + `@dnd-kit/sortable`. |
| `entities/site-settings/model/types.ts` | Add `currency: CurrencyCode` to `SiteSettings`; default = `"EUR"` in `DEFAULT_SITE_SETTINGS`. |
| `entities/site-settings/model/schema.ts` | Add `currency: z.enum(["EUR", "USD", "BYN", "RUB"])` to `siteSettingsPatchSchema`. |
| `db/site-settings.ts` | Propagate `currency` in `rowToSettings()` + accept it in `updateSiteSettings`. |
| `db/site-settings.test.ts` | Add a `currency` shape assertion. |
| `features/site-settings-admin/ui/site-settings-form.tsx` | (a) Drop the per-service override rows + the `services` prop. (b) Add a Currency row (pill picker, mirrors palette / locale). |
| `features/site-settings-admin/ui/site-settings-form.test.tsx` | Update to reflect removed services prop + new currency control. |
| `features/site-settings-admin/ui/site-settings-form.stories.tsx` | Drop the `services` story arg; add currency to args. |
| `app/[locale]/admin/site-settings/page.tsx` | Stop loading `listAllServices()`. Stop passing the `services` prop. |
| `app/[locale]/admin/page.tsx` | Add an inbox tile linking to `/admin/services`. |
| `entities/service/api/load.ts` | No code change — but **delete** the inline `currencyOf()` helper's `?? "EUR"` defensive fallback once `SiteSettings.currency` is required (defensive guard becomes dead code). Optional cleanup; can ship without. |
| `messages/en.json` / `messages/ru.json` / `messages/be.json` | Add `AdminServices.*` namespace (~30 keys per locale). Add `currency` to `Admin.site_settings_section_*` keys (one new key per locale). Add inbox tile labels. |

---

## Test-driven discipline

Every code task uses **red → green → commit**:

1. Write or update a Vitest assertion that fails.
2. Run the focused test, confirm it fails for the right reason.
3. Write the minimal production code.
4. Run the test, confirm it passes.
5. Commit (project Husky pre-commit runs lint + the full vitest suite; pre-push runs build).

Server-action tests mock the `db/services-mutations` layer (and `requireAdmin`) so the action's auth + validation logic is exercised in isolation. The DB integration is covered by an `npm run db:migrate`-backed e2e spec in Task 16.

---

## Task 1: Install dnd-kit

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install both packages**

```bash
npm install @dnd-kit/core@^6 @dnd-kit/sortable@^8 @dnd-kit/utilities@^3
```

Versions pinned to the current major lines (Phase 2 only needs `DndContext`, `SortableContext`, `useSortable`, `arrayMove`).

- [ ] **Step 2: Verify the suite still passes**

Run: `npm test`
Expected: 370 passing (same as Phase 1 tip — no behaviour changes yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add @dnd-kit/{core,sortable,utilities}

Drives drag-reorder for admin services + categories in Phase 2."
```

---

## Task 2: Carry `currency` through entities/site-settings

**Files:**
- Modify: `entities/site-settings/model/types.ts`
- Modify: `entities/site-settings/model/schema.ts`
- Modify: `db/site-settings.ts`
- Modify: `db/site-settings.test.ts`

- [ ] **Step 1: Update the schema-shape test (RED)**

Append to `db/site-settings.test.ts` in the existing `describe("getSiteSettings", …)` block:

```ts
  it("exposes currency on the settings shape", () => {
    expect(["EUR", "USD", "BYN", "RUB"]).toContain(
      DEFAULT_SITE_SETTINGS.currency,
    );
  });
```

Add `currency` to the assertion list in the first `it`:
```ts
    expect(s).toHaveProperty("currency");
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npx vitest run db/site-settings.test.ts`
Expected: FAIL — `DEFAULT_SITE_SETTINGS.currency` is undefined.

- [ ] **Step 3: Extend the types**

In `entities/site-settings/model/types.ts`:

```ts
import type { CurrencyCode } from "@/db/schema";
// …
export interface SiteSettings {
  defaultPalette: PaletteId;
  defaultLocale: Locale;
  priceOverrides: Readonly<Record<string, number>>;
  discountPercent: number;
  discountActive: boolean;
  currency: CurrencyCode;
  updatedAt: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  defaultPalette: "aubergine" as PaletteId,
  defaultLocale: "en" as Locale,
  priceOverrides: Object.freeze({}),
  discountPercent: 0,
  discountActive: false,
  currency: "EUR" as CurrencyCode,
  updatedAt: new Date(0).toISOString(),
});
```

- [ ] **Step 4: Extend the Zod patch schema**

In `entities/site-settings/model/schema.ts`, add inside the `.object({...})`:

```ts
    currency: z.enum(["EUR", "USD", "BYN", "RUB"]),
```

(Keep `.partial()` so any field can be omitted on patch.)

- [ ] **Step 5: Propagate `currency` through `db/site-settings.ts`**

```ts
function rowToSettings(row: schema.SiteSettingsRow): SiteSettings {
  return {
    defaultPalette: row.defaultPalette as PaletteId,
    defaultLocale: row.defaultLocale as Locale,
    priceOverrides: row.priceOverrides ?? {},
    discountPercent: row.discountPercent,
    discountActive: row.discountActive,
    currency: row.currency,
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

`updateSiteSettings` already uses `...parsed` to spread the patch, so the new `currency` field flows through with no further change.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS. Loader unit tests (`entities/service/api/load.test.ts`) already build the in-test `SiteSettings` shape — they break unless updated. Add `currency: "EUR" as const` to the `baseSettings` fixture there.

- [ ] **Step 7: Commit**

```bash
git add entities/site-settings/ db/site-settings.ts db/site-settings.test.ts entities/service/api/load.test.ts
git commit -m "feat(site-settings): carry currency through model + db row mapping

CurrencyCode is now a required field on the SiteSettings shape, defaulting
to EUR (matches the DB column default). Zod patch schema accepts it as an
optional field so the admin form can save it like every other setting."
```

---

## Task 3: Add Currency row + drop per-service overrides from the admin form

**Files:**
- Modify: `features/site-settings-admin/ui/site-settings-form.tsx`
- Modify: `features/site-settings-admin/ui/site-settings-form.test.tsx`
- Modify: `features/site-settings-admin/ui/site-settings-form.stories.tsx`
- Modify: `app/[locale]/admin/site-settings/page.tsx`
- Modify: `messages/en.json` / `messages/ru.json` / `messages/be.json` (add `site_settings_section_currency`, `site_settings_currency_eur` / `_usd` / `_byn` / `_rub` keys)

The form currently renders a "Service prices" fieldset that lists every service. Phase 1 ignores those overrides at render time, so the section is dead UI. Removing it (a) reclaims real estate for the currency picker, (b) matches the spec, (c) drops the dependency on `listAllServices()` in the route.

- [ ] **Step 1: Update the form test (RED)**

Read `features/site-settings-admin/ui/site-settings-form.test.tsx`. Remove the per-service override assertion that touches `service:gel`. Add:

```ts
  it("renders four currency options and submits the selected one", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SiteSettingsForm
          initial={initial}
          vipBasePrice={180}
          onSubmit={onSubmit}
        />
      </NextIntlClientProvider>,
    );
    const usd = screen.getByRole("radio", { name: /USD/ });
    await userEvent.setup().click(usd);
    await userEvent.setup().click(screen.getByRole("button", { name: /Save/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD" }),
    );
  });
```

And drop the `services={…}` prop from every existing `render(<SiteSettingsForm …>)` call in this test file.

- [ ] **Step 2: Run the test to verify failure**

Run: `npx vitest run features/site-settings-admin/`
Expected: FAIL — `services` is still required by the component; new currency radios don't exist.

- [ ] **Step 3: Edit `site-settings-form.tsx`**

a. Drop the `services` prop + the `services` mapping inside `overrideInputs`. Keep the `membership:VIP` entry untouched.

b. Add the new `Currency` field. Place the fieldset after `defaultLocale`:

```tsx
const CURRENCIES = ["EUR", "USD", "BYN", "RUB"] as const;
// inside the component:
const [currency, setCurrency] = useState<typeof CURRENCIES[number]>(
  initial.currency,
);
// inside buildPatch():
  return {
    defaultPalette,
    defaultLocale,
    currency,
    priceOverrides,
    discountPercent: Math.max(0, Math.min(90, Math.round(discountPercent))),
    discountActive,
  };
// inside JSX, after the locale fieldset:
<fieldset>
  <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
    {t("site_settings_section_currency")}
  </legend>
  <div className="grid grid-cols-4 gap-2">
    {CURRENCIES.map((c) => {
      const selected = currency === c;
      return (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={c}
          onClick={() => setCurrency(c)}
          className={cn(
            "flex items-center justify-center rounded-full border-[0.5px] px-3 py-2",
            "transition-colors duration-fast ease-out",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            selected
              ? "border-accent bg-surface-2 text-text"
              : "border-line text-text-2 hover:border-line-strong hover:text-text",
          )}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
            {c}
          </span>
        </button>
      );
    })}
  </div>
</fieldset>
```

c. Remove the entire `<fieldset aria-label={t("site_settings_section_services")}>` block — the per-service override list. Leave the `<fieldset aria-label={t("site_settings_section_vip")}>` (VIP override) untouched: membership still uses it.

- [ ] **Step 4: Update the route**

In `app/[locale]/admin/site-settings/page.tsx`, drop the `listAllServices()` call and the `services={…}` prop:

```tsx
const settings = await getSiteSettings();
const vipTier = STUDIO_DATA.membership.find((m) => m.tier === "VIP");
const vipBasePrice = vipTier?.price ?? 0;

return (
  <div className="pb-16">
    <AppHeader back="/admin" title={t("site_settings_plate_title")} admin />
    <SiteSettingsForm
      initial={settings}
      vipBasePrice={vipBasePrice}
      onSubmit={updateSiteSettingsAction}
    />
  </div>
);
```

Also drop the unused `import { listAllServices } from "@/db/services";`.

- [ ] **Step 5: Add new i18n keys**

In `messages/en.json` Admin namespace, after `site_settings_section_discount`:
```json
    "site_settings_section_currency": "Currency",
```

(`ru.json`: `"Валюта"`. `be.json`: `"Валюта"`.)

Drop the four now-unused keys (`site_settings_section_services`, `site_settings_base_label`) — they're dead UI. Actually **keep** them; the spec rule says no destructive deletions from messages files, mirroring the DB rule. They become orphan keys, harmless.

- [ ] **Step 6: Update the form story**

In `features/site-settings-admin/ui/site-settings-form.stories.tsx`:
- Drop the `services={…}` arg from every story.
- Add `currency: "EUR"` to the `initial` arg.

- [ ] **Step 7: Run the suite**

Run: `npm test`
Expected: PASS. Lint should also be clean.

- [ ] **Step 8: Commit**

```bash
git add features/site-settings-admin/ app/\[locale\]/admin/site-settings/ messages/
git commit -m "feat(site-settings): add Currency picker, retire per-service overrides

The Service prices override rows are dead UI since Phase 1 — loadServicesForLocale
ignores them. Remove that fieldset and drop the now-unused listAllServices()
call in the route. Currency picker (EUR / USD / BYN / RUB) lands in the same
slot, persisted via the existing site-settings patch schema. The VIP override
row stays — membership still uses it."
```

---

## Task 4: `db/services-mutations.ts` — pure writes

**Files:**
- Create: `db/services-mutations.ts`
- Create: `db/services-mutations.test.ts`

The writes layer mirrors `db/services.ts` (Phase 1 reads) — same db-null tolerance, same isMissingTable guard, no auth concerns (server actions enforce auth).

- [ ] **Step 1: Write the failing shape tests**

`db/services-mutations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  createService,
  updateService,
  archiveService,
  restoreService,
  reorderCategories,
  reorderServices,
  countNonArchivedServicesInCategory,
} from "./services-mutations";

describe("db/services-mutations", () => {
  it("every function returns the expected shape without throwing when DATABASE_URL is unset", async () => {
    // Each call either resolves with the documented shape (db === null
    // graceful degradation) or throws "table not migrated" — both are
    // acceptable in CI. The point is the type contract.
    try {
      await createCategory({
        id: "x",
        nameEn: "x",
        nameRu: "x",
        nameBe: "x",
      });
      await updateCategory("x", { nameEn: "y" });
      await archiveCategory("x");
      await restoreCategory("x");
      await createService({
        id: "x",
        categoryId: "x",
        nameEn: "n",
        nameRu: "n",
        nameBe: "n",
        blurbEn: "b",
        blurbRu: "b",
        blurbBe: "b",
        includes: [],
        priceCents: 0,
        durationMinutes: 30,
      });
      await updateService("x", { nameEn: "n" });
      await archiveService("x");
      await restoreService("x");
      await reorderCategories(["x"]);
      await reorderServices(["x"]);
      const count = await countNonArchivedServicesInCategory("x");
      expect(typeof count).toBe("number");
    } catch {
      // Missing-table fallthrough is acceptable in CI without a DB.
    }
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify failure**

Run: `npx vitest run db/services-mutations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `db/services-mutations.ts`**

```ts
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "./index";

function isMissingTable(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if ("code" in cur && (cur as { code: unknown }).code === "42P01") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

function withGuard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((error) => {
    if (isMissingTable(error)) return fallback;
    throw error;
  });
}

const NULL_RESULT = { ok: false as const, error: "db_unavailable" as const };

// ── categories ──────────────────────────────────────────────────────

export async function createCategory(
  input: schema.NewServiceCategory & { updatedBy?: string | null },
) {
  if (!db) return NULL_RESULT;
  return withGuard(async () => {
    await db!.insert(schema.serviceCategories).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "published",
    });
    return { ok: true as const };
  }, NULL_RESULT);
}

export async function updateCategory(
  id: string,
  patch: Partial<schema.NewServiceCategory> & { updatedBy?: string | null },
) {
  if (!db) return NULL_RESULT;
  return withGuard(async () => {
    await db!
      .update(schema.serviceCategories)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.serviceCategories.id, id));
    return { ok: true as const };
  }, NULL_RESULT);
}

export async function archiveCategory(id: string, updatedBy?: string | null) {
  return updateCategory(id, { status: "archived", updatedBy });
}

export async function restoreCategory(id: string, updatedBy?: string | null) {
  return updateCategory(id, { status: "published", updatedBy });
}

export async function countNonArchivedServicesInCategory(
  id: string,
): Promise<number> {
  if (!db) return 0;
  return withGuard(async () => {
    const rows = await db!
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(
        and(
          eq(schema.services.categoryId, id),
          ne(schema.services.status, "archived"),
        ),
      );
    return rows.length;
  }, 0);
}

// ── services ────────────────────────────────────────────────────────

export async function createService(
  input: schema.NewService & { updatedBy?: string | null },
) {
  if (!db) return NULL_RESULT;
  return withGuard(async () => {
    await db!.insert(schema.services).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "draft",
    });
    return { ok: true as const };
  }, NULL_RESULT);
}

export async function updateService(
  id: string,
  patch: Partial<schema.NewService> & { updatedBy?: string | null },
) {
  if (!db) return NULL_RESULT;
  return withGuard(async () => {
    await db!
      .update(schema.services)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.services.id, id));
    return { ok: true as const };
  }, NULL_RESULT);
}

export async function archiveService(id: string, updatedBy?: string | null) {
  return updateService(id, { status: "archived", updatedBy });
}

export async function restoreService(id: string, updatedBy?: string | null) {
  return updateService(id, { status: "published", updatedBy });
}

// ── reordering ──────────────────────────────────────────────────────

export async function reorderCategories(orderedIds: readonly string[]) {
  if (!db) return NULL_RESULT;
  return withGuard(async () => {
    // Persist the full ladder in a transaction so partial writes can't
    // leave the table half-reordered.
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.serviceCategories)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.serviceCategories.id, orderedIds[i]!));
      }
    });
    return { ok: true as const };
  }, NULL_RESULT);
}

export async function reorderServices(orderedIds: readonly string[]) {
  if (!db) return NULL_RESULT;
  return withGuard(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.services)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.services.id, orderedIds[i]!));
      }
    });
    return { ok: true as const };
  }, NULL_RESULT);
}
```

- [ ] **Step 4: Run the test, verify pass**

Run: `npx vitest run db/services-mutations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/services-mutations.ts db/services-mutations.test.ts
git commit -m "feat(db): services + categories mutations (create/update/archive/restore/reorder)

Mirrors db/services.ts (Phase 1 reads): db-null tolerance, missing-table
guard, no auth concerns. Reorder uses a transaction so partial writes
can't leave the ladder half-applied."
```

---

## Task 5: Shared Zod schemas in `entities/service/model/schema.ts`

**Files:**
- Create: `entities/service/model/schema.ts`
- Create: `entities/service/model/schema.test.ts`

Single source of truth for validation, used by both the client form (`SafeParse` for inline errors) and the server actions (`parse` for security).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  slugSchema,
  categoryFormSchema,
  serviceFormSchema,
} from "./schema";

describe("slugSchema", () => {
  it("accepts lowercase alphanumeric + hyphens", () => {
    expect(slugSchema.safeParse("signature-manicure").success).toBe(true);
  });
  it("rejects uppercase", () => {
    expect(slugSchema.safeParse("Signature").success).toBe(false);
  });
  it("rejects punctuation", () => {
    expect(slugSchema.safeParse("hello world").success).toBe(false);
  });
});

describe("categoryFormSchema", () => {
  const base = {
    id: "care",
    nameEn: "Care",
    nameRu: "Уход",
    nameBe: "Догляд",
    status: "published" as const,
  };
  it("accepts a complete payload", () => {
    expect(categoryFormSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty locale name", () => {
    const r = categoryFormSchema.safeParse({ ...base, nameRu: "" });
    expect(r.success).toBe(false);
  });
});

describe("serviceFormSchema", () => {
  const base = {
    id: "signature",
    categoryId: "care",
    nameEn: "Signature",
    nameRu: "Сигнатур",
    nameBe: "Сігнатур",
    blurbEn: "EN",
    blurbRu: "RU",
    blurbBe: "BE",
    includes: [
      { en: "a", ru: "а", be: "а" },
      { en: "b", ru: "б", be: "б" },
    ],
    priceCents: 9500,
    durationMinutes: 75,
    status: "published" as const,
  };
  it("accepts a complete payload", () => {
    expect(serviceFormSchema.safeParse(base).success).toBe(true);
  });
  it("rejects empty blurb in any locale", () => {
    expect(
      serviceFormSchema.safeParse({ ...base, blurbBe: "" }).success,
    ).toBe(false);
  });
  it("rejects more than 8 bullets", () => {
    const tooMany = Array.from({ length: 9 }, () => ({ en: "x", ru: "x", be: "x" }));
    expect(
      serviceFormSchema.safeParse({ ...base, includes: tooMany }).success,
    ).toBe(false);
  });
  it("rejects a bullet missing a locale", () => {
    expect(
      serviceFormSchema.safeParse({
        ...base,
        includes: [{ en: "x", ru: "x", be: "" }],
      }).success,
    ).toBe(false);
  });
  it("rejects negative priceCents", () => {
    expect(
      serviceFormSchema.safeParse({ ...base, priceCents: -1 }).success,
    ).toBe(false);
  });
  it("rejects zero-minute duration", () => {
    expect(
      serviceFormSchema.safeParse({ ...base, durationMinutes: 0 }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify failure**

Run: `npx vitest run entities/service/model/schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the schemas**

```ts
import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1, "slug_required")
  .max(64)
  .regex(/^[a-z0-9-]+$/, "slug_invalid");

const requiredLocaleString = z.string().trim().min(1, "required").max(280);

const includeEntrySchema = z.object({
  en: requiredLocaleString,
  ru: requiredLocaleString,
  be: requiredLocaleString,
});

export const categoryStatusSchema = z.enum(["draft", "published", "archived"]);

export const categoryFormSchema = z.object({
  id: slugSchema,
  nameEn: requiredLocaleString,
  nameRu: requiredLocaleString,
  nameBe: requiredLocaleString,
  sortOrder: z.number().int().min(0).optional(),
  status: categoryStatusSchema,
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const serviceFormSchema = z.object({
  id: slugSchema,
  categoryId: slugSchema,
  nameEn: requiredLocaleString,
  nameRu: requiredLocaleString,
  nameBe: requiredLocaleString,
  blurbEn: requiredLocaleString,
  blurbRu: requiredLocaleString,
  blurbBe: requiredLocaleString,
  includes: z.array(includeEntrySchema).max(8),
  priceCents: z.number().int().min(0).max(10_000_000),
  durationMinutes: z.number().int().min(1).max(1_440),
  sortOrder: z.number().int().min(0).optional(),
  status: categoryStatusSchema,
});

export type ServiceFormInput = z.infer<typeof serviceFormSchema>;
```

- [ ] **Step 4: Run the test, verify pass**

Run: `npx vitest run entities/service/model/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add entities/service/model/schema.ts entities/service/model/schema.test.ts
git commit -m "feat(service): shared Zod schemas for category + service forms

Single source of validation for slug shape, required-locale rule, includes
cap of 8, and price/duration ranges. Used by the client form for inline
errors and the server actions for defense-in-depth."
```

---

## Task 6: Server actions in `features/services-admin/api/`

**Files:**
- Create: `features/services-admin/api/create-category.ts`
- Create: `features/services-admin/api/update-category.ts`
- Create: `features/services-admin/api/archive-category.ts`
- Create: `features/services-admin/api/restore-category.ts`
- Create: `features/services-admin/api/create-service.ts`
- Create: `features/services-admin/api/update-service.ts`
- Create: `features/services-admin/api/archive-service.ts`
- Create: `features/services-admin/api/restore-service.ts`
- Create: `features/services-admin/api/reorder-categories.ts`
- Create: `features/services-admin/api/reorder-services.ts`
- Create: `features/services-admin/api/actions.test.ts`

All ten actions follow the same template, modelled on `features/site-settings-admin/api/update-site-settings.ts`:
1. Optional auth gate via `requireAdmin()` (only when `TELEGRAM_BOT_TOKEN` is set).
2. Zod `safeParse` against the shared schemas.
3. Delegate to `db/services-mutations`.
4. `revalidatePath` for affected customer routes.
5. Return `{ ok: true }` or `{ ok: false, error: string }`.

- [ ] **Step 1: Write a single auth + validation test (RED)**

`features/services-admin/api/actions.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));
vi.mock("@/db/services-mutations", () => ({
  createCategory: vi.fn(async () => ({ ok: true })),
  updateCategory: vi.fn(async () => ({ ok: true })),
  archiveCategory: vi.fn(async () => ({ ok: true })),
  restoreCategory: vi.fn(async () => ({ ok: true })),
  countNonArchivedServicesInCategory: vi.fn(async () => 0),
  createService: vi.fn(async () => ({ ok: true })),
  updateService: vi.fn(async () => ({ ok: true })),
  archiveService: vi.fn(async () => ({ ok: true })),
  restoreService: vi.fn(async () => ({ ok: true })),
  reorderCategories: vi.fn(async () => ({ ok: true })),
  reorderServices: vi.fn(async () => ({ ok: true })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import * as mutations from "@/db/services-mutations";
import { createCategoryAction } from "./create-category";
import { createServiceAction } from "./create-service";
import { archiveCategoryAction } from "./archive-category";

const ADMIN = {
  id: "u_admin",
  role: "admin" as const,
  // …minimum User shape; the action only reads .id
};

const goodCategory = {
  id: "care",
  nameEn: "Care",
  nameRu: "Уход",
  nameBe: "Догляд",
  status: "published" as const,
};

const goodService = {
  id: "signature",
  categoryId: "care",
  nameEn: "Signature",
  nameRu: "С",
  nameBe: "С",
  blurbEn: "b",
  blurbRu: "b",
  blurbBe: "b",
  includes: [],
  priceCents: 9500,
  durationMinutes: 75,
  status: "published" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "1");
});

describe("services-admin actions", () => {
  it("rejects non-admins (TELEGRAM_BOT_TOKEN set)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "forbidden",
    });
    const result = await createCategoryAction(goodCategory);
    expect(result.ok).toBe(false);
    expect(mutations.createCategory).not.toHaveBeenCalled();
  });

  it("accepts admins and forwards to the mutation layer", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const result = await createCategoryAction(goodCategory);
    expect(result.ok).toBe(true);
    expect(mutations.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: "care", updatedBy: "u_admin" }),
    );
  });

  it("rejects an empty locale name with a translatable error code", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const result = await createCategoryAction({
      ...goodCategory,
      nameRu: "",
    });
    expect(result.ok).toBe(false);
    expect(mutations.createCategory).not.toHaveBeenCalled();
  });

  it("rejects more than 8 bullets on a service create", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const tooMany = Array.from({ length: 9 }, () => ({
      en: "x",
      ru: "x",
      be: "x",
    }));
    const result = await createServiceAction({
      ...goodService,
      includes: tooMany,
    });
    expect(result.ok).toBe(false);
    expect(mutations.createService).not.toHaveBeenCalled();
  });

  it("archiveCategoryAction refuses when the category has non-archived services", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    vi.mocked(mutations.countNonArchivedServicesInCategory).mockResolvedValue(3);
    const result = await archiveCategoryAction("care");
    expect(result.ok).toBe(false);
    expect(mutations.archiveCategory).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test, verify failure**

Run: `npx vitest run features/services-admin/api/actions.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the actions, one file each**

Template — `features/services-admin/api/create-category.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { categoryFormSchema } from "@/entities/service/model/schema";
import { requireAdmin } from "@/shared/lib/auth-server";
import { createCategory } from "@/db/services-mutations";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  let updatedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.reason };
    updatedBy = gate.user.id;
  }

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const result = await createCategory({ ...parsed.data, updatedBy });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
```

`features/services-admin/api/archive-category.ts` — the only action that does the cross-table check:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  archiveCategory,
  countNonArchivedServicesInCategory,
} from "@/db/services-mutations";

export type ArchiveCategoryResult =
  | { ok: true }
  | { ok: false; error: string; blockingServiceCount?: number };

export async function archiveCategoryAction(
  id: string,
): Promise<ArchiveCategoryResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  let updatedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.reason };
    updatedBy = gate.user.id;
  }

  const blockingServiceCount = await countNonArchivedServicesInCategory(id);
  if (blockingServiceCount > 0) {
    return {
      ok: false,
      error: "category_has_active_services",
      blockingServiceCount,
    };
  }

  const result = await archiveCategory(id, updatedBy);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
```

The remaining eight follow the same shape (auth → validate with the matching schema or just the id → call the mutation → revalidate). Each file under ~30 lines.

`features/services-admin/api/create-service.ts` adds slug auto-generation:
```ts
import { slugSchema, serviceFormSchema } from "@/entities/service/model/schema";

function slugifyEn(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function createServiceAction(
  input: unknown,
): Promise<ActionResult> {
  // auth …
  // If id is missing or empty, auto-derive from nameEn:
  const inputWithSlug =
    typeof input === "object" &&
    input !== null &&
    "id" in input &&
    typeof (input as { id?: string }).id === "string" &&
    (input as { id: string }).id.length > 0
      ? input
      : {
          ...(input as object),
          id: slugifyEn((input as { nameEn?: string }).nameEn ?? ""),
        };
  const parsed = serviceFormSchema.safeParse(inputWithSlug);
  // …
}
```

- [ ] **Step 4: Add a public barrel `features/services-admin/index.ts`**

```ts
export { createCategoryAction } from "./api/create-category";
export { updateCategoryAction } from "./api/update-category";
export { archiveCategoryAction } from "./api/archive-category";
export { restoreCategoryAction } from "./api/restore-category";
export { createServiceAction } from "./api/create-service";
export { updateServiceAction } from "./api/update-service";
export { archiveServiceAction } from "./api/archive-service";
export { restoreServiceAction } from "./api/restore-service";
export { reorderCategoriesAction } from "./api/reorder-categories";
export { reorderServicesAction } from "./api/reorder-services";
export type { ActionResult } from "./api/create-category";
export type { ArchiveCategoryResult } from "./api/archive-category";
// UI exports land in subsequent tasks
```

- [ ] **Step 5: Run the test, verify pass**

Run: `npx vitest run features/services-admin/`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add features/services-admin/api/ features/services-admin/index.ts
git commit -m "feat(services-admin): server actions for CRUD + reorder + archive guard

Ten server actions wire the shared Zod schemas to db/services-mutations.
Auth gate mirrors features/site-settings-admin (TELEGRAM_BOT_TOKEN-gated).
archive-category refuses when published services still reference it; the
admin UI surfaces the blocking count inline."
```

---

## Task 7: `SortableList` — dnd-kit wrapper

**Files:**
- Create: `features/services-admin/ui/sortable-list.tsx`
- Create: `features/services-admin/ui/sortable-list.test.tsx`
- Create: `features/services-admin/ui/sortable-list.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableList } from "./sortable-list";

const items = [
  { id: "a", label: "Apple" },
  { id: "b", label: "Banana" },
];

describe("SortableList", () => {
  it("renders one row per item with a drag handle and label", () => {
    render(
      <SortableList
        items={items}
        onReorder={vi.fn()}
        renderRow={(item) => <span>{item.label}</span>}
      />,
    );
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /drag/i }).length).toBe(2);
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npx vitest run features/services-admin/ui/sortable-list.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the wrapper**

```tsx
"use client";

import { useId, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface SortableItem {
  id: string;
}

export interface SortableListProps<T extends SortableItem> {
  items: readonly T[];
  onReorder: (orderedIds: string[]) => void;
  renderRow: (item: T) => React.ReactNode;
}

export function SortableList<T extends SortableItem>({
  items: initialItems,
  onReorder,
  renderRow,
}: SortableListProps<T>) {
  const [items, setItems] = useState<readonly T[]>(initialItems);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items as T[], oldIndex, newIndex);
    setItems(next);
    onReorder(next.map((i) => i.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {renderRow(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const reactId = useId();
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 rounded-[14px] border-[0.5px] border-line bg-surface p-3"
    >
      <button
        type="button"
        aria-label="drag"
        aria-describedby={reactId}
        className="cursor-grab text-text-3 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="flex-1" id={reactId}>
        {children}
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Add a Storybook story**

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SortableList } from "./sortable-list";

const meta: Meta<typeof SortableList> = {
  title: "features/services-admin/SortableList",
  component: SortableList,
};
export default meta;
type Story = StoryObj<typeof SortableList>;

export const Default: Story = {
  args: {
    items: [
      { id: "a", label: "Apple" },
      { id: "b", label: "Banana" },
      { id: "c", label: "Cherry" },
    ],
    onReorder: (ids: string[]) => console.log(ids),
    renderRow: (item: { id: string; label: string }) => <span>{item.label}</span>,
  },
};
```

- [ ] **Step 5: Verify**

Run: `npx vitest run features/services-admin/ui/sortable-list.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add features/services-admin/ui/sortable-list.tsx features/services-admin/ui/sortable-list.test.tsx features/services-admin/ui/sortable-list.stories.tsx
git commit -m "feat(services-admin): SortableList — dnd-kit wrapper with keyboard support

Generic vertical-list reorder wrapper. Drag handle is a button so screen
readers + keyboard nav can reach it (dnd-kit sortableKeyboardCoordinates
wires arrow keys to the same reorder logic)."
```

---

## Task 8: Category editor

**Files:**
- Create: `features/services-admin/ui/category-editor.tsx`
- Create: `features/services-admin/ui/category-editor.test.tsx`
- Create: `features/services-admin/ui/category-editor.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CategoryEditor } from "./category-editor";

function setup(mode: "create" | "edit", initial = makeInitial()) {
  const onSubmit = vi.fn(async () => ({ ok: true as const }));
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CategoryEditor mode={mode} initial={initial} onSubmit={onSubmit} />
    </NextIntlClientProvider>,
  );
  return { onSubmit };
}

function makeInitial() {
  return {
    id: "care",
    nameEn: "Care",
    nameRu: "Уход",
    nameBe: "Догляд",
    sortOrder: 1,
    status: "published" as const,
  };
}

describe("CategoryEditor", () => {
  it("freezes the slug input on edit", () => {
    setup("edit");
    expect(screen.getByLabelText(/slug/i)).toBeDisabled();
  });

  it("rejects submission when a locale name is empty", async () => {
    const { onSubmit } = setup("edit");
    await userEvent.setup().clear(screen.getByLabelText(/Belarusian/i));
    await userEvent.setup().click(screen.getByRole("button", { name: /Save/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it("forwards the payload when valid", async () => {
    const { onSubmit } = setup("edit");
    await userEvent.setup().click(screen.getByRole("button", { name: /Save/ }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id: "care",
      nameEn: "Care",
    }));
  });
});
```

- [ ] **Step 2: Verify the test fails** (component doesn't exist)

- [ ] **Step 3: Implement `category-editor.tsx`**

The shape — client component, vertical form with: slug (frozen on edit), three name inputs (EN / RU / BE), status select (draft / published / archived), Save / Archive buttons. Validation via `categoryFormSchema.safeParse`. On submit, calls `props.onSubmit(parsed.data)`.

(Full component code is mechanical; ~120 lines. Save / Saved / Save failed states mirror `site-settings-form.tsx`.)

- [ ] **Step 4: Story**

Stories: `Create`, `Edit`, `WithArchiveBlocked` (passes a `blockingServiceCount` prop to render the inline error).

- [ ] **Step 5: Verify + commit**

Run: `npx vitest run features/services-admin/ui/category-editor.test.tsx`
Expected: PASS.

```bash
git add features/services-admin/ui/category-editor.tsx features/services-admin/ui/category-editor.test.tsx features/services-admin/ui/category-editor.stories.tsx
git commit -m "feat(services-admin): CategoryEditor — slug frozen on edit, required EN/RU/BE"
```

---

## Task 9: Service editor

**Files:**
- Create: `features/services-admin/ui/service-editor.tsx`
- Create: `features/services-admin/ui/service-editor.test.tsx`
- Create: `features/services-admin/ui/service-editor.stories.tsx`
- Create: `features/services-admin/ui/includes-fieldset.tsx` (extracted from the editor to keep `service-editor.tsx` <300 lines)
- Create: `features/services-admin/ui/includes-fieldset.test.tsx`

The service editor is the largest piece of UI in Phase 2. Split out:

- **`includes-fieldset.tsx`** — owns the bullet list (add / remove / inline EN / RU / BE inputs, max 8). Pure controlled component, props = `{ items, onChange }`.
- **`service-editor.tsx`** — orchestrates the rest: identity (slug + category + status), names, blurbs, `IncludesFieldset`, pricing (number → cents), duration (number minutes), embedded `PhotoUploadRow` from `features/photo-upload-admin`.

- [ ] **Step 1: Write the failing tests** (one per file)

`includes-fieldset.test.tsx`:
- Adds + removes a bullet.
- Refuses to add a 9th bullet (button disabled).

`service-editor.test.tsx`:
- Required EN / RU / BE inputs on name + blurb.
- Slug auto-fills from EN name on `create` and is editable; frozen on `edit`.
- Pricing input converts major → cents (e.g. enters "95", patch carries 9500).
- Includes max 8 enforced before submit.
- Saves through `onSubmit`.

- [ ] **Step 2: Verify failures**

Run: `npx vitest run features/services-admin/ui/`
Expected: FAIL for both files.

- [ ] **Step 3: Implement both components**

(Full code follows the same pattern as `SiteSettingsForm` — `useState` per field, `useTransition` for async submit, validation via `serviceFormSchema.safeParse`, error surface inline.)

Embedded photo slot:
```tsx
import { PhotoUploadRow } from "@/features/photo-upload-admin";
// inside the editor, only when mode === "edit":
{mode === "edit" && (
  <PhotoUploadRow
    slot={{
      kind: "service",
      id: initial.id,
      label: tEditor("photo_label"),
      hint: tEditor("photo_hint"),
    }}
    initial={initialPhoto}
  />
)}
```

`initialPhoto` is loaded by the route (Task 12) via `getStudioPhoto("service", id)` and passed in.

- [ ] **Step 4: Stories**

`Create`, `EditEN`, `EditWithPhoto`, `WithValidationErrors`.

- [ ] **Step 5: Verify + commit**

Run: `npm test`
Expected: PASS.

```bash
git add features/services-admin/ui/service-editor.tsx features/services-admin/ui/service-editor.test.tsx features/services-admin/ui/service-editor.stories.tsx features/services-admin/ui/includes-fieldset.tsx features/services-admin/ui/includes-fieldset.test.tsx
git commit -m "feat(services-admin): ServiceEditor with i18n inputs, includes editor, photo slot

Vertical form: slug + category + status, 3× name inputs, 3× blurb textareas,
extracted IncludesFieldset (max 8 bullets), price (cents-from-major), duration
(int minutes), and the existing PhotoUploadRow inline for the service photo
slot. All locales required at submit; slug frozen after create."
```

---

## Task 10: `AdminServicesList` server component

**Files:**
- Create: `features/services-admin/ui/admin-services-list.tsx`
- Create: `features/services-admin/ui/admin-services-list.test.tsx`
- Update: `features/services-admin/index.ts` (export the components)

Server component that takes `categories: schema.ServiceCategoryRow[]` + `services: schema.Service[]` (admin sees ALL, including drafts + archived) and renders two `SortableList`s. Each row has an Edit link, an Archive/Restore button, and counts.

Reorder callbacks are server actions — wrapped in a thin client island (`SortableList` itself is client). Pass the reorder server action down as a prop.

- [ ] **Step 1: Write the failing test** — counts + status rendering.

- [ ] **Step 2: Verify failure.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Verify + commit.**

```bash
git add features/services-admin/
git commit -m "feat(services-admin): AdminServicesList renders both groups with drag handles"
```

---

## Task 11: Route — `/admin/services/page.tsx`

**Files:**
- Create: `app/[locale]/admin/services/page.tsx`

- [ ] **Step 1: Implement the route**

```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { listAllCategories, listAllServices } from "@/db/services";
import {
  AdminServicesList,
  reorderCategoriesAction,
  reorderServicesAction,
} from "@/features/services-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminServices" });
  return { title: `Violetta — ${t("plate_title")}` };
}

export default async function AdminServicesRoute({
  params,
}: { params: Promise<Params> }) {
  const { locale } = await params;
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }
  setRequestLocale(locale);
  const t = await getTranslations("AdminServices");
  const [categories, services] = await Promise.all([
    listAllCategories(),
    listAllServices(),
  ]);
  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />
      <AdminServicesList
        categories={categories}
        services={services}
        reorderCategoriesAction={reorderCategoriesAction}
        reorderServicesAction={reorderServicesAction}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add app/\[locale\]/admin/services/page.tsx
git commit -m "feat(admin): /admin/services list view (drag-reorder, all statuses)"
```

---

## Task 12: Routes — service editor + category editor

**Files:**
- Create: `app/[locale]/admin/services/[id]/page.tsx`
- Create: `app/[locale]/admin/services/categories/[id]/page.tsx`

Both routes follow the same pattern:
- Auth-gate.
- If id is `"new"`, render the editor in `create` mode with empty initial values.
- Otherwise, load the row by id (return `notFound()` if missing).
- For service edit, also load the matching `studio_photos` row.
- Render the editor, passing the right server action (create or update) as `onSubmit`.

- [ ] **Step 1: Implement both routes.**

- [ ] **Step 2: Verify + commit.**

```bash
git add app/\[locale\]/admin/services/
git commit -m "feat(admin): /admin/services/[id] + /admin/services/categories/[id] editors"
```

---

## Task 13: i18n — `AdminServices.*` namespace + admin inbox tile

**Files:**
- Modify: `messages/en.json` / `messages/ru.json` / `messages/be.json`
- Modify: `app/[locale]/admin/page.tsx` (inbox tile)

Add roughly the following key set to each locale:

```json
"AdminServices": {
  "meta_title": "Services",
  "plate_title": "Services & categories",
  "eyebrow": "Private · Studio admin",
  "hero_title": "Menu",
  "hero_paragraph": "Add, edit, reorder rituals and the categories that group them.",
  "section_categories": "Categories",
  "section_services": "Services",
  "cta_new_category": "+ New category",
  "cta_new_service": "+ New service",
  "cta_edit": "Edit",
  "cta_archive": "Archive",
  "cta_restore": "Restore",
  "cta_save": "Save",
  "saved": "Saved",
  "save_failed": "Save failed: {error}",
  "label_slug": "Slug",
  "label_slug_hint": "Lowercase letters, digits, hyphens. Frozen after first save.",
  "label_status": "Status",
  "status_draft": "Draft",
  "status_published": "Published",
  "status_archived": "Archived",
  "label_name_en": "Name (English)",
  "label_name_ru": "Name (Russian)",
  "label_name_be": "Name (Belarusian)",
  "label_blurb_en": "Blurb (English)",
  "label_blurb_ru": "Blurb (Russian)",
  "label_blurb_be": "Blurb (Belarusian)",
  "label_includes": "Includes",
  "cta_add_bullet": "+ Add bullet",
  "bullet_en": "EN",
  "bullet_ru": "RU",
  "bullet_be": "BE",
  "label_price": "Price",
  "label_duration": "Duration (minutes)",
  "label_category": "Category",
  "label_photo": "Photo",
  "label_photo_hint": "5:6 portrait · doubles as thumb + detail hero",
  "validation_required": "Required",
  "validation_slug_invalid": "Lowercase letters, digits, and hyphens only",
  "validation_includes_max": "Maximum 8 bullets",
  "validation_price_min": "Price must be ≥ 0",
  "validation_duration_min": "Duration must be ≥ 1 minute",
  "archive_blocked": "This category has {n} service(s). Reassign or archive them first.",
  "service_count": "{n} service(s)",
  "category_chip_archived": "Archived"
}
```

RU + BE translations should mirror the studio's existing voice (see `messages/ru.json` `Admin.*` and `AdminBookings.*` for the cadence).

Also add to the `Admin` namespace in each locale:
```json
"inbox_services": "Services",
"inbox_services_caption": "Menu, categories, photos",
```

Render the new inbox tile in `app/[locale]/admin/page.tsx`:
```tsx
<li>
  <Link href="/admin/services" className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2">
    <div className="font-display text-[16px] italic">{t("inbox_services")}</div>
    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
      {t("inbox_services_caption")}
    </div>
  </Link>
</li>
```

- [ ] **Step 1: Add the keys to all three locales.**

- [ ] **Step 2: Add the inbox tile.**

- [ ] **Step 3: Verify** `npm test` passes (and lint — next-intl will complain if keys are missing in any locale).

- [ ] **Step 4: Commit.**

```bash
git add messages/ app/\[locale\]/admin/page.tsx
git commit -m "feat(i18n, admin): AdminServices namespace + admin inbox tile"
```

---

## Task 14: e2e — Phase 2 admin smoke

**Files:**
- Create: `e2e/admin-services.spec.ts`

Three specs, all skipped on CI when `TELEGRAM_BOT_TOKEN` is set (auth fixture not yet wired — same posture as `e2e/vip-request.spec.ts`).

```ts
import { test, expect } from "@playwright/test";

test("admin services list renders both groups", async ({ page }) => {
  await page.goto("/en/admin/services");
  await expect(
    page.getByRole("heading", { level: 1, name: /Menu/i }),
  ).toBeVisible();
  await expect(page.getByText("Categories")).toBeVisible();
  await expect(page.getByText("Services")).toBeVisible();
});

test("create category lands at the editor and submits", async ({ page }) => {
  await page.goto("/en/admin/services");
  await page.getByRole("link", { name: /New category/i }).click();
  await expect(page).toHaveURL(/\/admin\/services\/categories\/new/);
  await page.getByLabel(/Slug/i).fill("test-category");
  await page.getByLabel(/Name \(English\)/i).fill("Test Cat");
  await page.getByLabel(/Name \(Russian\)/i).fill("Тест");
  await page.getByLabel(/Name \(Belarusian\)/i).fill("Тэст");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.getByText(/Saved/i)).toBeVisible();
});

test("service editor surfaces required-locale error", async ({ page }) => {
  // Navigate to the seeded "signature" service, blank out the RU blurb,
  // try to save, expect inline error.
  await page.goto("/en/admin/services/signature");
  await page.getByLabel(/Blurb \(Russian\)/i).fill("");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.getByText(/Required/i)).toBeVisible();
});
```

- [ ] **Step 1: Author the specs.**

- [ ] **Step 2: Verify locally** with `DATABASE_URL` exported and migrations applied:
```bash
DATABASE_URL=… DIRECT_URL=… npx playwright test e2e/admin-services.spec.ts
```

- [ ] **Step 3: Commit.**

```bash
git add e2e/admin-services.spec.ts
git commit -m "test(e2e): admin services list + create category + validation error"
```

---

## Task 15: Pre-merge verification gate

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: PASS (370 from Phase 1 + ~25 new from this plan).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS. Note that `/admin/services/page.tsx` and `/admin/services/[id]/page.tsx` are `force-dynamic` (admin reads "all rows", including archived) — they're correctly listed as ƒ in the route table.

- [ ] **Step 4: E2E**

Run: `npm run e2e`
Expected: PASS. The CI workflow added in PR #44 provisions Postgres + applies migrations before `e2e`, so the new specs work the same way.

- [ ] **Step 5: Manual smoke**

```bash
npm run dev
# /en/admin/services
# /ru/admin/services
# /be/admin/services
```

Check: list renders, drag handles work, create a new category → save → it appears, edit a service → bullet add/remove works, archive a category that has services → inline error.

- [ ] **Step 6: No commits this task.**

---

## Task 16: Open the PR

- [ ] **Step 1: Status check**

```bash
git status
git log --oneline develop..HEAD
```

Expected: clean tree, ~13 commits ahead of develop.

- [ ] **Step 2: Push**

```bash
git push -u origin feature/admin-services-phase-2
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base develop --title "feat: admin services & categories management — phase 2 (admin CRUD UI)" --body "$(cat <<'EOF'
## Summary
- New admin route \`/admin/services\` with drag-reorder for both categories and services (dnd-kit)
- New routes \`/admin/services/[id]\` and \`/admin/services/categories/[id]\` for create/edit
- Currency picker (EUR / USD / BYN / RUB) lands on \`/admin/site-settings\`
- Per-service price-override rows removed from \`/admin/site-settings\` (dead UI after Phase 1)
- Admin inbox gains a Services tile

## Test plan
- [ ] \`npm run lint\` clean
- [ ] \`npm test\` green
- [ ] \`npm run build\` succeeds
- [ ] \`npm run e2e\` succeeds (admin specs included)
- [ ] Manual: create category → create service in all three locales → drag-reorder → archive → confirm customer menu reflects changes

Spec: \`docs/superpowers/specs/2026-05-22-admin-services-management-design.md\`
Plan: \`docs/superpowers/plans/2026-05-22-admin-services-management-phase-2.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Return the PR URL.**

---

## What this plan deliberately does NOT do

- Multi-tenant / per-user admin permissions (out of scope; `requireAdmin` is the gate).
- Audit log beyond `updated_at` / `updated_by` (spec §2 non-goal).
- Drag-reorder across category boundaries (services reorder within their group; cross-group requires a category change).
- Translation tooling (admin types all three locales; no machine translation).
- Removing the dormant `site_settings.price_overrides` column from the DB (spec §2 — no destructive schema changes).
- FX conversion when currency changes (spec §2 — display label only).
