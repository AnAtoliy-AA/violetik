# Admin Site Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin panel at `/admin/site-settings` that controls site-wide defaults: palette, locale, per-service / VIP-tier price overrides, and a global discount %.

**Architecture:** Singleton row in a new `site_settings` Postgres table. Pure `resolvePrice` helper overlays overrides + applies discount; every price-rendering UI flows through it. Default palette is read in the locale layout. Default locale is read via a 60s-TTL cache in `proxy.ts` (Next 16 proxy runs on Node by default). Auth tightening: wire the existing `requireAdmin()` helper into every `/admin/*` route.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM (postgres-js), next-intl, Tailwind v4, Vitest + Testing Library, Storybook, Zod (already a dep).

**Spec:** [docs/superpowers/specs/2026-05-21-admin-site-settings-design.md](../specs/2026-05-21-admin-site-settings-design.md)

---

## File Map

**New:**
- `db/migrations/0005_<slug>.sql` (drizzle-generated)
- `db/site-settings.ts` + `db/site-settings.test.ts`
- `entities/site-settings/index.ts`
- `entities/site-settings/model/types.ts`
- `entities/site-settings/model/resolve-price.ts` + `.test.ts`
- `entities/site-settings/model/schema.ts` (Zod)
- `shared/lib/site-settings-server.ts`
- `shared/lib/site-settings-cache.ts`
- `shared/ui/price/price.tsx` + `.stories.tsx` + `.test.tsx`
- `shared/ui/price/index.ts`
- `features/site-settings-admin/api/update-site-settings.ts`
- `features/site-settings-admin/ui/site-settings-form.tsx` + `.stories.tsx` + `.test.tsx`
- `features/site-settings-admin/index.ts`
- `app/[locale]/admin/site-settings/page.tsx`

**Modified:**
- `db/schema.ts` — add `siteSettings` table
- `app/[locale]/layout.tsx` — read default palette from DB
- `proxy.ts` — async wrapper using cached default locale
- `app/[locale]/admin/page.tsx` — `requireAdmin()` + tile linking to site-settings
- `app/[locale]/admin/bookings/page.tsx` — `requireAdmin()`
- `app/[locale]/admin/vip-requests/page.tsx` — `requireAdmin()`
- `entities/service/ui/service-card.tsx` — `<Price>`
- `entities/service/ui/service-menu-item.tsx` — `<Price>`
- `views/services-catalog/ui/services-catalog-page.tsx` — thread settings to cards
- `views/service-detail/ui/sections/detail-hero.tsx` — `<Price>`
- `views/service-detail/ui/sections/sticky-cta.tsx` — accept `ResolvedPrice`
- `views/service-detail/ui/service-detail-page.tsx` — pass resolved price
- `views/booking/ui/steps/service-step.tsx` — resolved price
- `views/booking/ui/steps/confirm-step.tsx` — resolved price
- `views/membership/ui/membership-page.tsx` — pass settings to client
- `views/membership/ui/membership-page-client.tsx` — overlay override on monthly
- `messages/{en,ru,be}.json` — add `Admin.site_settings_*` + reuse `PaletteSwitcher.palettes.*` and `LocaleSwitcher.{en,ru,be}`

---

## Task 1: Add `siteSettings` table to schema + generate migration

**Files:**
- Modify: `db/schema.ts`
- Create (generated): `db/migrations/0005_<slug>.sql`, `db/migrations/meta/0005_snapshot.json`

- [ ] **Step 1.1: Add table definition + types**

Append to [db/schema.ts](db/schema.ts):

```ts
import { boolean, jsonb, check } from "drizzle-orm/pg-core";

export const siteSettings = pgTable(
  "site_settings",
  {
    id: text("id").primaryKey().default("singleton"),
    defaultPalette: text("default_palette").notNull().default("aubergine"),
    defaultLocale: text("default_locale").notNull().default("en"),
    priceOverrides: jsonb("price_overrides")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    discountPercent: integer("discount_percent").notNull().default(0),
    discountActive: boolean("discount_active").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    singleton: check(
      "site_settings_singleton",
      sql`${table.id} = 'singleton'`,
    ),
    discountRange: check(
      "site_settings_discount_range",
      sql`${table.discountPercent} BETWEEN 0 AND 90`,
    ),
  }),
);

export type SiteSettingsRow = typeof siteSettings.$inferSelect;
export type NewSiteSettingsRow = typeof siteSettings.$inferInsert;
```

(Note: `boolean`/`jsonb`/`check` need to be added to the existing `drizzle-orm/pg-core` import at the top of the file.)

- [ ] **Step 1.2: Generate the migration**

Run: `npm run db:generate`
Expected: a new file appears under `db/migrations/0005_*.sql` + meta snapshot.

- [ ] **Step 1.3: Append singleton seed to the migration**

Open the generated `db/migrations/0005_*.sql` and add at the bottom (after the `CREATE TABLE` statement, with the `--> statement-breakpoint` separator):

```sql
--> statement-breakpoint
INSERT INTO "site_settings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;
```

- [ ] **Step 1.4: Commit**

```bash
git add db/schema.ts db/migrations/
git commit -m "feat(db): site_settings singleton table"
```

---

## Task 2: `entities/site-settings` model + `resolvePrice` helper (TDD)

**Files:**
- Create: `entities/site-settings/model/types.ts`
- Create: `entities/site-settings/model/resolve-price.ts`
- Create: `entities/site-settings/model/resolve-price.test.ts`
- Create: `entities/site-settings/model/schema.ts`
- Create: `entities/site-settings/index.ts`

- [ ] **Step 2.1: Write failing tests for `resolvePrice`**

Create [entities/site-settings/model/resolve-price.test.ts](entities/site-settings/model/resolve-price.test.ts):

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./types";
import { resolvePrice } from "./resolve-price";

describe("resolvePrice", () => {
  it("returns the catalog price unchanged when no override + no discount", () => {
    const r = resolvePrice("service:gel", 145, DEFAULT_SITE_SETTINGS);
    expect(r).toEqual({ base: 145, effective: 145, hasDiscount: false });
  });

  it("uses an override over the catalog price", () => {
    const r = resolvePrice("service:gel", 145, {
      ...DEFAULT_SITE_SETTINGS,
      priceOverrides: { "service:gel": 160 },
    });
    expect(r).toEqual({ base: 160, effective: 160, hasDiscount: false });
  });

  it("applies an active discount to the effective price", () => {
    const r = resolvePrice("service:gel", 100, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 20,
      discountActive: true,
    });
    expect(r).toEqual({ base: 100, effective: 80, hasDiscount: true });
  });

  it("ignores discount when discountActive is false", () => {
    const r = resolvePrice("service:gel", 100, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 20,
      discountActive: false,
    });
    expect(r).toEqual({ base: 100, effective: 100, hasDiscount: false });
  });

  it("rounds the effective price to a whole euro", () => {
    const r = resolvePrice("service:gel", 95, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 15,
      discountActive: true,
    });
    expect(r.effective).toBe(81); // 95 * 0.85 = 80.75 → 81
  });

  it("stacks override + discount", () => {
    const r = resolvePrice("service:gel", 145, {
      ...DEFAULT_SITE_SETTINGS,
      priceOverrides: { "service:gel": 200 },
      discountPercent: 10,
      discountActive: true,
    });
    expect(r).toEqual({ base: 200, effective: 180, hasDiscount: true });
  });

  it("treats price 0 as free (never discounted)", () => {
    const r = resolvePrice("service:free", 0, {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 30,
      discountActive: true,
    });
    expect(r).toEqual({ base: 0, effective: 0, hasDiscount: false });
  });
});
```

Run: `npx vitest run entities/site-settings/model/resolve-price.test.ts`
Expected: FAIL (modules don't exist).

- [ ] **Step 2.2: Create `types.ts`**

[entities/site-settings/model/types.ts](entities/site-settings/model/types.ts):

```ts
import type { PaletteId } from "@/shared/config/palettes";
import type { Locale } from "@/i18n/routing";

export type PriceOverrideKey = `service:${string}` | "membership:VIP";

export interface SiteSettings {
  defaultPalette: PaletteId;
  defaultLocale: Locale;
  priceOverrides: Readonly<Record<string, number>>;
  discountPercent: number;
  discountActive: boolean;
  updatedAt: string;
}

export interface ResolvedPrice {
  base: number;
  effective: number;
  hasDiscount: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  defaultPalette: "aubergine" as PaletteId,
  defaultLocale: "en" as Locale,
  priceOverrides: Object.freeze({}),
  discountPercent: 0,
  discountActive: false,
  updatedAt: new Date(0).toISOString(),
});
```

- [ ] **Step 2.3: Create `resolve-price.ts`**

[entities/site-settings/model/resolve-price.ts](entities/site-settings/model/resolve-price.ts):

```ts
import type { PriceOverrideKey, ResolvedPrice, SiteSettings } from "./types";

export function resolvePrice(
  key: PriceOverrideKey,
  catalogPrice: number,
  settings: SiteSettings,
): ResolvedPrice {
  const override = settings.priceOverrides[key];
  const base = typeof override === "number" ? override : catalogPrice;

  if (base === 0) {
    return { base: 0, effective: 0, hasDiscount: false };
  }

  if (!settings.discountActive || settings.discountPercent === 0) {
    return { base, effective: base, hasDiscount: false };
  }

  const effective = Math.round(base * (1 - settings.discountPercent / 100));
  return { base, effective, hasDiscount: true };
}
```

- [ ] **Step 2.4: Run tests**

Run: `npx vitest run entities/site-settings/model/resolve-price.test.ts`
Expected: 7 passed.

- [ ] **Step 2.5: Create Zod schema**

[entities/site-settings/model/schema.ts](entities/site-settings/model/schema.ts):

```ts
import { z } from "zod";
import { PALETTES } from "@/shared/config/palettes";
import { routing } from "@/i18n/routing";

const PALETTE_IDS = PALETTES.map((p) => p.id) as [string, ...string[]];
const LOCALES = routing.locales as readonly string[] as [string, ...string[]];

const overrideKey = z
  .string()
  .regex(
    /^(service:[a-z0-9_-]+|membership:VIP)$/,
    "Override keys must be `service:<id>` or `membership:VIP`",
  );

export const siteSettingsPatchSchema = z
  .object({
    defaultPalette: z.enum(PALETTE_IDS),
    defaultLocale: z.enum(LOCALES),
    priceOverrides: z.record(overrideKey, z.number().int().min(0).max(10_000)),
    discountPercent: z.number().int().min(0).max(90),
    discountActive: z.boolean(),
  })
  .partial();

export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;
```

- [ ] **Step 2.6: Write Zod schema rejection tests**

Create [entities/site-settings/model/schema.test.ts](entities/site-settings/model/schema.test.ts):

```ts
import { describe, expect, it } from "vitest";
import { siteSettingsPatchSchema } from "./schema";

describe("siteSettingsPatchSchema", () => {
  it("accepts an empty patch", () => {
    expect(siteSettingsPatchSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a service price override", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "service:gel": 150 },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a Member override (only VIP is allowed)", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "membership:Member": 50 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown override key shape", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "garbage:foo": 50 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown palette", () => {
    const r = siteSettingsPatchSchema.safeParse({ defaultPalette: "neon" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown locale", () => {
    const r = siteSettingsPatchSchema.safeParse({ defaultLocale: "de" });
    expect(r.success).toBe(false);
  });

  it("rejects discountPercent > 90", () => {
    const r = siteSettingsPatchSchema.safeParse({ discountPercent: 91 });
    expect(r.success).toBe(false);
  });

  it("rejects negative discount", () => {
    const r = siteSettingsPatchSchema.safeParse({ discountPercent: -5 });
    expect(r.success).toBe(false);
  });

  it("rejects negative prices", () => {
    const r = siteSettingsPatchSchema.safeParse({
      priceOverrides: { "service:gel": -10 },
    });
    expect(r.success).toBe(false);
  });
});
```

Run: `npx vitest run entities/site-settings/model/schema.test.ts`
Expected: 9 passed.

- [ ] **Step 2.7: Create slice public API**

[entities/site-settings/index.ts](entities/site-settings/index.ts):

```ts
export { resolvePrice } from "./model/resolve-price";
export { DEFAULT_SITE_SETTINGS } from "./model/types";
export type {
  PriceOverrideKey,
  ResolvedPrice,
  SiteSettings,
} from "./model/types";
export { siteSettingsPatchSchema } from "./model/schema";
export type { SiteSettingsPatch } from "./model/schema";
```

- [ ] **Step 2.8: Commit**

```bash
git add entities/site-settings
git commit -m "feat(entities): site-settings model + resolvePrice + zod schema"
```

---

## Task 3: `db/site-settings.ts` data-access (TDD)

**Files:**
- Create: `db/site-settings.ts`
- Create: `db/site-settings.test.ts`

- [ ] **Step 3.1: Write the failing tests**

[db/site-settings.test.ts](db/site-settings.test.ts):

```ts
import { describe, expect, it } from "vitest";
import { getSiteSettings } from "./site-settings";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";

describe("getSiteSettings", () => {
  it("returns frozen defaults when DB is unconfigured", async () => {
    const s = await getSiteSettings();
    // No DATABASE_URL in test env → defaults.
    expect(s.defaultPalette).toBe(DEFAULT_SITE_SETTINGS.defaultPalette);
    expect(s.defaultLocale).toBe(DEFAULT_SITE_SETTINGS.defaultLocale);
    expect(s.priceOverrides).toEqual({});
    expect(s.discountPercent).toBe(0);
    expect(s.discountActive).toBe(false);
  });
});
```

Run: `npx vitest run db/site-settings.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3.2: Implement `db/site-settings.ts`**

[db/site-settings.ts](db/site-settings.ts):

```ts
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsPatchSchema,
  type SiteSettings,
  type SiteSettingsPatch,
} from "@/entities/site-settings";
import type { PaletteId } from "@/shared/config/palettes";
import type { Locale } from "@/i18n/routing";

const SINGLETON_ID = "singleton";

function rowToSettings(row: schema.SiteSettingsRow): SiteSettings {
  return {
    defaultPalette: row.defaultPalette as PaletteId,
    defaultLocale: row.defaultLocale as Locale,
    priceOverrides: row.priceOverrides ?? {},
    discountPercent: row.discountPercent,
    discountActive: row.discountActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!db) return DEFAULT_SITE_SETTINGS;

  const existing = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.id, SINGLETON_ID))
    .limit(1);

  if (existing.length > 0) return rowToSettings(existing[0]);

  // Lazy-insert defaults; rely on ON CONFLICT in case two requests
  // hit an empty table at once.
  const inserted = await db
    .insert(schema.siteSettings)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing({ target: schema.siteSettings.id })
    .returning();

  if (inserted.length > 0) return rowToSettings(inserted[0]);

  // The conflicting insert means a row exists now — fetch it.
  const refetch = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.id, SINGLETON_ID))
    .limit(1);
  return refetch.length > 0 ? rowToSettings(refetch[0]) : DEFAULT_SITE_SETTINGS;
}

export async function updateSiteSettings(
  patch: SiteSettingsPatch,
  updatedBy: string,
): Promise<SiteSettings> {
  const parsed = siteSettingsPatchSchema.parse(patch);
  if (!db) return DEFAULT_SITE_SETTINGS;

  // Ensure the singleton exists, then update.
  await getSiteSettings();
  const rows = await db
    .update(schema.siteSettings)
    .set({
      ...parsed,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(schema.siteSettings.id, SINGLETON_ID))
    .returning();
  return rowToSettings(rows[0]);
}
```

- [ ] **Step 3.3: Run tests**

Run: `npx vitest run db/site-settings.test.ts`
Expected: PASS (db-null branch).

- [ ] **Step 3.4: Commit**

```bash
git add db/site-settings.ts db/site-settings.test.ts
git commit -m "feat(db): site_settings get + update with lazy singleton insert"
```

---

## Task 4: `<Price>` shared UI primitive (TDD + Storybook)

**Files:**
- Create: `shared/ui/price/price.tsx`
- Create: `shared/ui/price/price.test.tsx`
- Create: `shared/ui/price/price.stories.tsx`
- Create: `shared/ui/price/index.ts`

- [ ] **Step 4.1: Write failing tests**

[shared/ui/price/price.test.tsx](shared/ui/price/price.test.tsx):

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Price } from "./price";

describe("Price", () => {
  it("renders only the effective price when there's no discount", () => {
    render(<Price resolved={{ base: 95, effective: 95, hasDiscount: false }} />);
    expect(screen.getByText("€95")).toBeInTheDocument();
    expect(screen.queryByText("€95", { selector: "s" })).toBeNull();
  });

  it("renders the struck base price beside the discounted effective price", () => {
    render(
      <Price resolved={{ base: 100, effective: 80, hasDiscount: true }} />,
    );
    expect(screen.getByText("€80")).toBeInTheDocument();
    const struck = screen.getByText("€100");
    expect(struck.tagName).toBe("S");
  });

  it("renders the free label when effective is 0", () => {
    render(
      <Price
        resolved={{ base: 0, effective: 0, hasDiscount: false }}
        freeLabel="Free"
      />,
    );
    expect(screen.getByText("Free")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run shared/ui/price/price.test.tsx`
Expected: FAIL.

- [ ] **Step 4.2: Implement `<Price>`**

[shared/ui/price/price.tsx](shared/ui/price/price.tsx):

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import type { ResolvedPrice } from "@/entities/site-settings";

export interface PriceProps extends HTMLAttributes<HTMLSpanElement> {
  resolved: ResolvedPrice;
  freeLabel?: string;
}

export function Price({ resolved, freeLabel, className, ...rest }: PriceProps) {
  if (resolved.effective === 0 && freeLabel) {
    return (
      <span className={className} {...rest}>
        {freeLabel}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)} {...rest}>
      <span>€{resolved.effective}</span>
      {resolved.hasDiscount ? (
        <s className="font-mono text-[11px] text-text-3">€{resolved.base}</s>
      ) : null}
    </span>
  );
}
```

[shared/ui/price/index.ts](shared/ui/price/index.ts):

```ts
export { Price } from "./price";
export type { PriceProps } from "./price";
```

- [ ] **Step 4.3: Storybook story**

[shared/ui/price/price.stories.tsx](shared/ui/price/price.stories.tsx):

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Price } from "./price";

const meta: Meta<typeof Price> = {
  title: "shared/ui/Price",
  component: Price,
};
export default meta;
type Story = StoryObj<typeof Price>;

export const NoDiscount: Story = {
  args: { resolved: { base: 145, effective: 145, hasDiscount: false } },
};

export const Discounted: Story = {
  args: { resolved: { base: 145, effective: 116, hasDiscount: true } },
};

export const Free: Story = {
  args: {
    resolved: { base: 0, effective: 0, hasDiscount: false },
    freeLabel: "Free",
  },
};
```

- [ ] **Step 4.4: Run tests + commit**

```bash
npx vitest run shared/ui/price/price.test.tsx
git add shared/ui/price
git commit -m "feat(shared/ui): Price primitive renders struck base on discount"
```

---

## Task 5: Server-cached getter + TTL cache for proxy

**Files:**
- Create: `shared/lib/site-settings-server.ts`
- Create: `shared/lib/site-settings-cache.ts`

- [ ] **Step 5.1: React-cached getter (per-request memoization)**

[shared/lib/site-settings-server.ts](shared/lib/site-settings-server.ts):

```ts
import { cache } from "react";
import { getSiteSettings } from "@/db/site-settings";

// React's `cache()` memoizes within a single server render — so
// layout/page/proxy don't double-fetch.
export const getSiteSettingsServer = cache(getSiteSettings);
```

- [ ] **Step 5.2: Module-level TTL cache for proxy**

[shared/lib/site-settings-cache.ts](shared/lib/site-settings-cache.ts):

```ts
import "server-only";
import { getSiteSettings } from "@/db/site-settings";
import type { Locale } from "@/i18n/routing";

let cached: { value: Locale; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function getCachedDefaultLocale(): Promise<Locale> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  const settings = await getSiteSettings();
  cached = { value: settings.defaultLocale, expiresAt: now + TTL_MS };
  return cached.value;
}

export function invalidateDefaultLocaleCache(): void {
  cached = null;
}
```

- [ ] **Step 5.3: Commit**

```bash
git add shared/lib/site-settings-server.ts shared/lib/site-settings-cache.ts
git commit -m "feat(shared/lib): server-cached + ttl-cached site settings"
```

---

## Task 6: Apply default palette in locale layout

**Files:**
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 6.1: Replace constant with DB-derived default**

In [app/[locale]/layout.tsx](app/[locale]/layout.tsx) replace the `data-palette={DEFAULT_PALETTE_ID}` literal with a fetched value:

```tsx
// Add near the other imports:
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

// Inside `LocaleLayout`, after `setRequestLocale(locale)`:
const settings = await getSiteSettingsServer();

// Use settings.defaultPalette in the <html> tag:
<html
  lang={locale}
  data-palette={settings.defaultPalette}
  …
>
```

Remove the now-unused `DEFAULT_PALETTE_ID` import.

- [ ] **Step 6.2: Run tests**

Run: `npm test`
Expected: all 262+ tests still pass.

- [ ] **Step 6.3: Commit**

```bash
git add app/[locale]/layout.tsx
git commit -m "feat(layout): default palette from site_settings"
```

---

## Task 7: Apply default locale in `proxy.ts`

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 7.1: Wrap createMiddleware in an async proxy**

Replace [proxy.ts](proxy.ts) contents with:

```ts
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { getCachedDefaultLocale } from "@/shared/lib/site-settings-cache";

export default async function proxy(req: NextRequest) {
  const defaultLocale = await getCachedDefaultLocale();
  const handler = createMiddleware({ ...routing, defaultLocale });
  return handler(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 7.2: Run tests + a quick build sanity check**

```bash
npm test
npm run build 2>&1 | tail -30
```

Expected: tests pass; build succeeds (build runs proxy through the Next.js bundler — failures here mean the runtime/import resolution is wrong).

- [ ] **Step 7.3: Commit**

```bash
git add proxy.ts
git commit -m "feat(proxy): default locale from site_settings (60s ttl cache)"
```

---

## Task 8: Apply `<Price>` to service-card + service-menu-item

**Files:**
- Modify: `entities/service/ui/service-card.tsx`
- Modify: `entities/service/ui/service-menu-item.tsx`
- Modify: their existing tests (if any assertion depends on the literal `€{price}` string)

- [ ] **Step 8.1: Update `service-card.tsx`**

Add a `resolvedPrice?: ResolvedPrice` prop. When provided, render via `<Price>`; when missing, fall back to the current behavior (so existing Storybook stories keep working without threading settings). Snippet:

```tsx
import type { ResolvedPrice } from "@/entities/site-settings";
import { Price } from "@/shared/ui/price";

export interface ServiceCardProps extends HTMLAttributes<HTMLDivElement> {
  service: Service;
  variant?: NailTileVariant;
  topRule?: boolean;
  palette?: readonly [string, string];
  resolvedPrice?: ResolvedPrice;
}

// In the JSX, replace
//   <span className="…">€{service.price}</span>
// with:
<span className="shrink-0 font-mono text-[13px] text-gold">
  {resolvedPrice ? (
    <Price resolved={resolvedPrice} />
  ) : (
    <>€{service.price}</>
  )}
</span>
```

- [ ] **Step 8.2: Same edit in `service-menu-item.tsx`**

Same prop, same JSX swap — the existing classes already match.

- [ ] **Step 8.3: Add a discount-active story for each**

Append a `WithDiscount` story to both [service-card.stories.tsx](entities/service/ui/service-card.stories.tsx) and [service-menu-item.stories.tsx](entities/service/ui/service-menu-item.stories.tsx) passing a `resolvedPrice={{ base: 145, effective: 116, hasDiscount: true }}`.

- [ ] **Step 8.4: Run tests**

Run: `npx vitest run entities/service`
Expected: PASS (existing tests cover the fallback path; new story tests cover the discounted path).

- [ ] **Step 8.5: Commit**

```bash
git add entities/service
git commit -m "feat(entities/service): accept resolved price + render via <Price>"
```

---

## Task 9: Thread settings through services-catalog + service-detail + booking

**Files:**
- Modify: `views/services-catalog/ui/services-catalog-page.tsx`
- Modify: `views/service-detail/ui/sections/detail-hero.tsx`
- Modify: `views/service-detail/ui/sections/sticky-cta.tsx`
- Modify: `views/service-detail/ui/service-detail-page.tsx`
- Modify: `views/booking/ui/steps/service-step.tsx`
- Modify: `views/booking/ui/steps/confirm-step.tsx`

- [ ] **Step 9.1: services-catalog-page**

Read settings at the top:

```tsx
import { resolvePrice } from "@/entities/site-settings";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";

// …inside the page component:
const settings = await getSiteSettingsServer();
```

When rendering each `<ServiceCard>` / `<ServiceMenuItem>` pass `resolvedPrice={resolvePrice('service:'+service.id, service.price, settings)}`.

- [ ] **Step 9.2: detail-hero**

Pass a `resolvedPrice: ResolvedPrice` prop in addition to (or instead of) the existing `service.price` rendering. Replace the `€{service.price}` span with `<Price resolved={resolvedPrice}/>`.

`service-detail-page.tsx` computes the value and passes it down (it's an async server component already).

- [ ] **Step 9.3: sticky-cta**

Change the prop signature to `{ serviceId: string; resolved: ResolvedPrice }` and render `<Price resolved={resolved}/>` instead of `€{price}`. Update the call site in `service-detail-page.tsx`.

- [ ] **Step 9.4: service-step (client component)**

`views/booking/ui/booking-page.tsx` is `"use client"`. The async server boundary is one level up at [app/[locale]/booking/[step]/page.tsx](app/[locale]/booking/[step]/page.tsx) (and [app/[locale]/booking/confirmation/page.tsx](app/[locale]/booking/confirmation/page.tsx) for `confirm-step`).

Plan:
1. In `app/[locale]/booking/[step]/page.tsx`, `await getSiteSettingsServer()`.
2. Pre-resolve every service price once: `const pricedServices = STUDIO_DATA.services.map(s => ({ service: s, resolved: resolvePrice('service:'+s.id, s.price, settings) }))`.
3. Pass `pricedServices` as a new prop on `<BookingPage>`.
4. `BookingPage` threads it through to `<ServiceStep pricedServices={…}/>` (replace `ServiceStep`'s internal `STUDIO_DATA.services.map(...)` with `pricedServices.map(...)`).
5. Each `ServiceStep` button renders `<Price resolved={p.resolved}/>` where the literal `€{s.price}` is today.

- [ ] **Step 9.5: confirm-step**

Same lift via the confirmation route (`app/[locale]/booking/confirmation/page.tsx`). Pass the same `pricedServices` array down through `BookingPage` and into `ConfirmStep`. ConfirmStep looks up the selected service's resolved price by id.

- [ ] **Step 9.6: Wiring test for the discount path**

Behavior added in Task 9 (every catalog/detail render funnels through `<Price>`) needs at least one integration-style test that exercises the wiring end-to-end with a discount-active settings object.

Create [views/services-catalog/ui/services-catalog-page.test.tsx](views/services-catalog/ui/services-catalog-page.test.tsx) (or extend an existing test file in the same directory if one exists):

```tsx
import { render, screen } from "@testing-library/react";
import { ServiceCard } from "@/entities/service";
import { resolvePrice, DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { STUDIO_DATA } from "@/entities/studio";

it("renders <s>€base</s> alongside the discounted price when discount is active", () => {
  const settings = {
    ...DEFAULT_SITE_SETTINGS,
    discountPercent: 20,
    discountActive: true,
  };
  const gel = STUDIO_DATA.services.find((s) => s.id === "gel")!;
  const resolved = resolvePrice("service:gel", gel.price, settings);
  render(<ServiceCard service={gel} resolvedPrice={resolved} />);
  // 145 * 0.8 = 116
  expect(screen.getByText("€116")).toBeInTheDocument();
  expect(screen.getByText("€145").tagName).toBe("S");
});
```

Run: `npx vitest run views/services-catalog`
Expected: PASS.

- [ ] **Step 9.7: Run tests + build**

```bash
npm test
npm run build 2>&1 | tail -20
```

Expected: both pass.

- [ ] **Step 9.8: Commit**

```bash
git add views/services-catalog views/service-detail views/booking
git commit -m "feat(views): resolve prices through site settings + render via <Price>"
```

---

## Task 10: Membership pricing with VIP override (TDD)

**Files:**
- Modify: `views/membership/ui/membership-page.tsx`
- Modify: `views/membership/ui/membership-page-client.tsx`
- Modify: `views/membership/ui/membership-page.test.tsx` (extend)
- Modify: `views/membership/ui/membership-tier-card.tsx` (accept `<Price>` slot)

- [ ] **Step 10.1: Extend the existing membership tests**

Add cases to [views/membership/ui/membership-page.test.tsx](views/membership/ui/membership-page.test.tsx):

```tsx
it("respects a VIP price override (monthly view)", () => {
  render(<MembershipPage … settings={{ ...DEFAULT_SITE_SETTINGS, priceOverrides: { 'membership:VIP': 200 } }} />);
  expect(screen.getByText("€200")).toBeInTheDocument();
});

it("shows annual as monthly × 10", () => {
  // click annual toggle, assert €2000
});

it("shows struck base + discounted effective when discount active", () => {
  // settings with discount 10 %, override 200 → effective 180; strike shows €200
});
```

(Adapt to the actual signature of the existing test render helper.)

Run: `npx vitest run views/membership` — expect failures for the new cases.

- [ ] **Step 10.2: Pass settings into the page**

In `membership-page.tsx`, fetch `settings = await getSiteSettingsServer()` and pass it to `MembershipPageClient`.

- [ ] **Step 10.3: Update `membership-page-client.tsx`**

Replace the existing `pricing()` helper with one that uses `resolvePrice`:

```tsx
function pricing(
  tier: MembershipTier,
  billing: Billing,
  freeLabel: string,
  perMonth: string,
  perYear: string,
  settings: SiteSettings,
): { resolved: ResolvedPrice | null; cadenceLabel: string; freeLabel?: string } {
  if (tier.price === 0) {
    return { resolved: null, cadenceLabel: "", freeLabel };
  }
  const monthly = resolvePrice("membership:VIP", tier.price, settings);
  if (billing === "annual") {
    return {
      resolved: {
        base: monthly.base * 10,
        effective: monthly.effective * 10,
        hasDiscount: monthly.hasDiscount,
      },
      cadenceLabel: perYear,
    };
  }
  return { resolved: monthly, cadenceLabel: perMonth };
}
```

Pass the resolved value into a new `priceSlot?: ReactNode` prop on `MembershipTierCard` (replacing the current `priceLabel` for non-free tiers). Render `<Price resolved={…} />` for paid tiers, plain `freeLabel` for free.

- [ ] **Step 10.4: Run tests + commit**

```bash
npx vitest run views/membership
git add views/membership
git commit -m "feat(membership): VIP price overrides + discount via resolvePrice"
```

---

## Task 11: Tighten auth on existing admin routes

**Files:**
- Modify: `app/[locale]/admin/page.tsx`
- Modify: `app/[locale]/admin/bookings/page.tsx`
- Modify: `app/[locale]/admin/vip-requests/page.tsx`

- [ ] **Step 11.1: Replace `if (!session) redirect(...)` with `requireAdmin`**

In each file, replace the existing gate block with:

```tsx
import { requireAdmin } from "@/shared/lib/auth-server";

// …inside the route handler, after `const { locale } = await params;`:
const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
if (AUTH_REQUIRED) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect({ href: "/sign-in", locale });
  }
}
```

(`requireAdmin()` already calls the DB and checks `role === 'admin'` — see `shared/lib/auth-server.ts`. The dev/CI bypass remains controlled by `TELEGRAM_BOT_TOKEN`, so existing tests are unaffected.)

- [ ] **Step 11.2: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11.3: Commit**

```bash
git add app/[locale]/admin/page.tsx app/[locale]/admin/bookings/page.tsx app/[locale]/admin/vip-requests/page.tsx
git commit -m "fix(admin): require role=admin (not just signed-in) on /admin/*"
```

---

## Task 12: `features/site-settings-admin` UI + server action

**Files:**
- Create: `features/site-settings-admin/api/update-site-settings.ts`
- Create: `features/site-settings-admin/ui/site-settings-form.tsx`
- Create: `features/site-settings-admin/ui/site-settings-form.stories.tsx`
- Create: `features/site-settings-admin/ui/site-settings-form.test.tsx`
- Create: `features/site-settings-admin/index.ts`

- [ ] **Step 12.1: Server action**

[features/site-settings-admin/api/update-site-settings.ts](features/site-settings-admin/api/update-site-settings.ts):

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  siteSettingsPatchSchema,
  type SiteSettingsPatch,
} from "@/entities/site-settings";
import { requireAdmin } from "@/shared/lib/auth-server";
import { updateSiteSettings } from "@/db/site-settings";
import { invalidateDefaultLocaleCache } from "@/shared/lib/site-settings-cache";

export type UpdateSiteSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateSiteSettingsAction(
  patch: unknown,
): Promise<UpdateSiteSettingsResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.reason };

  const parsed = siteSettingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  await updateSiteSettings(parsed.data, auth.user.id);
  invalidateDefaultLocaleCache();
  revalidatePath("/", "layout");
  return { ok: true };
}
```

- [ ] **Step 12.2: Form component**

[features/site-settings-admin/ui/site-settings-form.tsx](features/site-settings-admin/ui/site-settings-form.tsx):

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PALETTES } from "@/shared/config/palettes";
import { routing } from "@/i18n/routing";
import type { SiteSettings, SiteSettingsPatch } from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";
import { updateSiteSettingsAction } from "../api/update-site-settings";

export interface SiteSettingsFormProps {
  initial: SiteSettings;
  services: ReadonlyArray<{ id: string; name: string; basePrice: number }>;
  vipBasePrice: number;
}

type OverrideInput = string; // "" means "delete the key"

export function SiteSettingsForm({
  initial,
  services,
  vipBasePrice,
}: SiteSettingsFormProps) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const [defaultPalette, setDefaultPalette] = useState(initial.defaultPalette);
  const [defaultLocale, setDefaultLocale] = useState(initial.defaultLocale);
  const [discountPercent, setDiscountPercent] = useState(initial.discountPercent);
  const [discountActive, setDiscountActive] = useState(initial.discountActive);

  // Per-key input state. Empty string means "no override".
  const [overrideInputs, setOverrideInputs] = useState<Record<string, OverrideInput>>(
    () => {
      const obj: Record<string, OverrideInput> = {};
      for (const s of services) {
        const key = `service:${s.id}`;
        obj[key] = key in initial.priceOverrides
          ? String(initial.priceOverrides[key])
          : "";
      }
      obj["membership:VIP"] = "membership:VIP" in initial.priceOverrides
        ? String(initial.priceOverrides["membership:VIP"])
        : "";
      return obj;
    },
  );

  function buildPatch(): SiteSettingsPatch {
    const priceOverrides: Record<string, number> = {};
    for (const [key, raw] of Object.entries(overrideInputs)) {
      if (raw === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) priceOverrides[key] = Math.round(n);
    }
    return {
      defaultPalette,
      defaultLocale,
      priceOverrides,
      discountPercent: Math.max(0, Math.min(90, Math.round(discountPercent))),
      discountActive,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await updateSiteSettingsAction(buildPatch());
      if (result.ok) setStatus({ kind: "saved" });
      else setStatus({ kind: "error", message: result.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8 px-[22px] py-6">
      <fieldset aria-label={t("site_settings_section_palette")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_palette")}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {PALETTES.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="palette"
                value={p.id}
                checked={defaultPalette === p.id}
                onChange={() => setDefaultPalette(p.id)}
              />
              <span className="text-[13px]">{p.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset aria-label={t("site_settings_section_locale")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_locale")}
        </legend>
        <div className="flex gap-3">
          {routing.locales.map((l) => (
            <label key={l} className="flex items-center gap-2">
              <input
                type="radio"
                name="locale"
                value={l}
                checked={defaultLocale === l}
                onChange={() => setDefaultLocale(l)}
              />
              <span className="text-[13px] uppercase">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset aria-label={t("site_settings_section_services")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_services")}
        </legend>
        <ul className="flex flex-col gap-2">
          {services.map((s) => {
            const key = `service:${s.id}`;
            return (
              <li key={key} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px]">{s.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                    base €{s.basePrice}
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10000}
                  placeholder="—"
                  aria-label={`${s.name} override`}
                  className="w-24 rounded border border-line bg-surface px-2 py-1 text-right"
                  value={overrideInputs[key]}
                  onChange={(e) =>
                    setOverrideInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset aria-label={t("site_settings_section_vip")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_vip")}
        </legend>
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
            base €{vipBasePrice}/mo
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            placeholder="—"
            aria-label="VIP price override"
            className="w-24 rounded border border-line bg-surface px-2 py-1 text-right"
            value={overrideInputs["membership:VIP"]}
            onChange={(e) =>
              setOverrideInputs((prev) => ({
                ...prev,
                "membership:VIP": e.target.value,
              }))
            }
          />
        </div>
      </fieldset>

      <fieldset aria-label={t("site_settings_section_discount")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_discount")}
        </legend>
        <div className="flex items-center gap-4">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            aria-label="discount percent"
            className="w-20 rounded border border-line bg-surface px-2 py-1 text-right"
            value={discountPercent}
            onChange={(e) =>
              setDiscountPercent(
                Math.max(0, Math.min(90, Number(e.target.value) || 0)),
              )
            }
          />
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={discountActive}
              onChange={(e) => setDiscountActive(e.target.checked)}
            />
            {t("site_settings_discount_active")}
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("site_settings_save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("site_settings_saved")}
          </span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-accent">
            {t("site_settings_error", { error: status.message })}
          </span>
        ) : null}
      </div>
    </form>
  );
}
```

(`auth.reason` from the server action — `"unauthorized" | "forbidden"` — surfaces verbatim through this `error` channel. Acceptable for v1 since only admins reach this UI; future polish would map those strings through translations.)

- [ ] **Step 12.3: Test + Story**

[features/site-settings-admin/ui/site-settings-form.test.tsx](features/site-settings-admin/ui/site-settings-form.test.tsx) — wrap renders in `NextIntlClientProvider` with `messages/en.json`, mock `updateSiteSettingsAction` via `vi.mock("../api/update-site-settings", ...)`:

- renders one radio per palette
- renders one radio per locale
- renders one number input per service + one for VIP
- clamps discount input to 0–90 (set to 95, blur, expect value 90)
- submitting calls the mocked action with the patch matching the form state
- on action error, renders the error in a `role="alert"` element

[features/site-settings-admin/ui/site-settings-form.stories.tsx](features/site-settings-admin/ui/site-settings-form.stories.tsx) — one `Default` story with mock data and one `WithOverrides` story showing the form populated.

[features/site-settings-admin/index.ts](features/site-settings-admin/index.ts):

```ts
export { SiteSettingsForm } from "./ui/site-settings-form";
export type { SiteSettingsFormProps } from "./ui/site-settings-form";
```

- [ ] **Step 12.4: Run tests + commit**

```bash
npx vitest run features/site-settings-admin
git add features/site-settings-admin
git commit -m "feat(features): site-settings admin form + server action"
```

---

## Task 13: `/admin/site-settings` route + admin dashboard tile

**Files:**
- Create: `app/[locale]/admin/site-settings/page.tsx`
- Modify: `app/[locale]/admin/page.tsx` (add tile)
- Modify: `messages/{en,ru,be}.json` (new keys)

- [ ] **Step 13.1: New route**

[app/[locale]/admin/site-settings/page.tsx](app/[locale]/admin/site-settings/page.tsx):

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { getSiteSettings } from "@/db/site-settings";
import { STUDIO_DATA } from "@/entities/studio";
import { AppHeader } from "@/widgets/app-header";
import { SiteSettingsForm } from "@/features/site-settings-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export default async function SiteSettingsRoute({
  params,
}: { params: Promise<Params> }) {
  const { locale } = await params;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const auth = await requireAdmin();
    if (!auth.ok) redirect({ href: "/sign-in", locale });
  }
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const settings = await getSiteSettings();
  const vipTier = STUDIO_DATA.membership.find((m) => m.tier === "VIP")!;

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("site_settings_plate_title")} />
      <SiteSettingsForm
        initial={settings}
        services={STUDIO_DATA.services.map((s) => ({
          id: s.id, name: s.name, basePrice: s.price,
        }))}
        vipBasePrice={vipTier.price}
      />
    </div>
  );
}
```

- [ ] **Step 13.2: Add a tile to `/admin`**

In `app/[locale]/admin/page.tsx`, append a `<li>` linking to `/admin/site-settings` inside the existing `<ul className="grid grid-cols-2 gap-3">`. Use the same styling.

- [ ] **Step 13.3: Translations**

Add to `messages/en.json` under `Admin`:

```json
"site_settings_plate_title": "Site settings",
"site_settings_tile_title": "Site settings",
"site_settings_section_palette": "Default palette",
"site_settings_section_locale": "Default language",
"site_settings_section_services": "Service prices",
"site_settings_section_vip": "VIP membership",
"site_settings_section_discount": "Global discount",
"site_settings_discount_active": "Discount active",
"site_settings_save": "Save",
"site_settings_saved": "Saved",
"site_settings_error": "Save failed: {error}"
```

Add Russian and Belarusian equivalents to `ru.json` and `be.json`.

- [ ] **Step 13.4: Run lint + tests + build**

```bash
npm run lint
npm test
npm run build 2>&1 | tail -30
```

Expected: all pass.

- [ ] **Step 13.5: Commit**

```bash
git add app/[locale]/admin/site-settings/ app/[locale]/admin/page.tsx messages/
git commit -m "feat(admin): /admin/site-settings page + dashboard tile + i18n"
```

---

## Task 14: Final verification + PR

- [ ] **Step 14.1: Full verification matrix**

```bash
npm run lint
npm test
npm run build 2>&1 | tail -40
```

All three must pass with no errors. The "No story files for views/**" Storybook warning is pre-existing and unrelated.

- [ ] **Step 14.2: Smoke screenshot (optional but recommended)**

Start `npm run dev` and click through `/admin/site-settings`. Change palette + discount, save, reload `/en` in incognito — verify the change took effect.

- [ ] **Step 14.3: PR**

Push + open PR against `main` using the project's `pr-description` skill.

```bash
git push -u origin feat/admin-site-settings
```

Then run `/pr-description` (or follow the skill's flow manually) with a body that:
- Calls out the **net-new admin role check** on `/admin/*` (security tightening, not just the new feature).
- Lists the four new admin controls.
- Notes the migration adds one table + one default-row insert.
- Links to the spec and plan.
