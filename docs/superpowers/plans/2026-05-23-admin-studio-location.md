# Admin Studio Location, Map & City-Driven SEO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the studio's address, country, city/town (per locale), timezone, and lat/lng geo-coordinates admin-editable through a new `/admin/studio` route; render an OSM iframe map + universal Google Maps directions link in the home footer when enabled; drive per-locale SEO copy (`<title>`/`<meta description>`/`<meta keywords>`) from the chosen city and emit `schema.org/BeautySalon` JSON-LD.

**Architecture:** Extends the existing `site_settings` singleton row with 11 new columns (3 address × locale, country, 3 city × locale, timezone, lat, lng, map_visible). Sibling admin route `/admin/studio` mirrors the existing `/admin/site-settings` pattern: server component, `requireAdmin` gate, `getSiteSettings()` reader, client `<StudioForm>` posting through a server action that calls `updateSiteSettings()` and `revalidatePath("/", "layout")`. Public surface: home footer takes settings as a prop and renders address + a new `<StudioMap>` widget (server component, no client JS, OSM iframe). SEO: `generateMetadata` swaps in templated keys when city is set; a `<LocalBusinessJsonLd>` shared component emits structured data in the locale layout. Booking timezone refactored to read from settings with env-var fallback.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM + Postgres, TypeScript strict, Zod, next-intl, next-themes, Tailwind v4, Vitest + Testing Library + jsdom, Storybook (browser-based Vitest project), Playwright.

**Spec:** [docs/superpowers/specs/2026-05-23-admin-studio-location-design.md](../specs/2026-05-23-admin-studio-location-design.md)

---

## File map

### New

- `db/migrations/0011_studio_location.sql`
- `shared/config/countries.ts` + `shared/config/countries.test.ts`
- `shared/config/time-zones.ts` + `shared/config/time-zones.test.ts`
- `entities/site-settings/model/locale-fields.ts` (`cityForLocale`, `addressForLocale`) + `.test.ts`
- `features/studio-admin/index.ts`
- `features/studio-admin/api/update-studio.ts` + `update-studio.test.ts`
- `features/studio-admin/ui/studio-form.tsx` + `.test.tsx` + `.stories.tsx`
- `widgets/studio-map/index.ts`
- `widgets/studio-map/ui/studio-map.tsx` + `.test.tsx` + `.stories.tsx`
- `shared/ui/local-business-jsonld/index.ts`
- `shared/ui/local-business-jsonld/local-business-jsonld.tsx` + `.test.tsx` + `.stories.tsx`
- `app/[locale]/admin/studio/page.tsx`
- `e2e/admin-studio.spec.ts`

### Modified

- `db/schema.ts` — append columns to `siteSettings`, add two range CHECK constraints
- `db/site-settings.ts` — extend `rowToSettings()` to map the new columns
- `db/site-settings.test.ts` — round-trip & defaults assertions for new columns
- `entities/site-settings/model/types.ts` — extend `SiteSettings` + `DEFAULT_SITE_SETTINGS`
- `entities/site-settings/model/schema.ts` — extend `siteSettingsPatchSchema` (incl. cross-field refinements)
- `entities/site-settings/model/schema.test.ts` — accept/reject coverage for new fields
- `entities/site-settings/index.ts` — re-export `cityForLocale` / `addressForLocale`
- `entities/studio/model/data.ts` — delete `studio.address` field
- `entities/studio/model/types.ts` — delete `address` from `StudioInfo`
- `views/home/ui/sections/home-footer.tsx` — accept `settings` prop, mount `<StudioMap>`, drop `STUDIO_DATA.studio.address`
- `views/home/ui/sections/home-footer.test.tsx` — new file (footer has no test today)
- `views/home/ui/home-page.tsx` — accept `settings` + `locale` props, thread to `HomeFooter`
- `app/[locale]/home/page.tsx` (home route — note `[locale]/page.tsx` is just a `/welcome` redirect) — pass `settings` + `locale` to `<HomePage>`
- `views/booking/ui/steps/confirm-step.tsx` — accept `location` prop, drop `STUDIO_DATA.studio.address`
- `views/confirmation/ui/confirmation-page.tsx` — accept `location` prop, drop `STUDIO_DATA.studio.address`
- the server parents that render the two components above — load settings, pass `studioLocationLine(settings, locale)`
- `app/[locale]/layout.tsx` — switch `generateMetadata` to templated keys + mount `<LocalBusinessJsonLd>`
- `app/[locale]/admin/page.tsx` — add "Studio" inbox tile
- `shared/lib/google-calendar/working-hours.ts` — split into `bookingTimeZoneFromSettings()` + `bookingTimeZoneFallback()`; deprecate `bookingTimeZone()`
- `shared/lib/google-calendar/index.ts` — re-export the new helpers
- `views/booking/api/submit.ts` — route timezone through settings
- `app/[locale]/booking/confirmation/page.tsx` — route timezone through settings
- `app/[locale]/admin/bookings/page.tsx` — route timezone through settings
- `app/api/booking/slots/route.ts` — route timezone through settings
- `messages/en.json`, `messages/ru.json`, `messages/be.json` — add `Site.meta_title_with_city` / `meta_description_with_city` / `meta_keywords_with_city`; `Footer.map_aria` / `map_title` / `get_directions`; `AdminStudio.*` namespace; `Admin.inbox_studio{,_caption}`

### Not touched

- `bookings` schema (no behavior change to existing rows)
- The proxy / middleware (no routing change)
- `app/sitemap.ts` (city changes add no routes)
- Yandex/2GIS deep links (out of scope)

---

## Reviewer advisories folded in (from spec review)

1. Drop the `Intl.supportedValuesOf` fallback — Node 18+ guarantees it.
2. Footer takes `settings` as a prop, threaded from the home view; no extra DB hit.
3. Booking timezone audit is explicit: 5 callers (`views/booking/api/submit.ts`, `app/[locale]/booking/confirmation/page.tsx`, `app/[locale]/admin/bookings/page.tsx`, `app/api/booking/slots/route.ts`, plus the helper itself).
4. v1 ships a `window.confirm()` guard for timezone changes — see Task 14.

## Plan-reviewer fixes folded in

5. Home page lives at `app/[locale]/home/page.tsx`; `[locale]/page.tsx` is a `/welcome` redirect — corrected in Tasks 13.
6. `STUDIO_DATA.studio.address` has three consumers (footer + confirm step + confirmation page) — Task 13 routes all three through settings atomically.
7. `requireAdmin` returns `reason: "unauthorized" | "forbidden"`, not `"not_admin"` — corrected in Task 7 tests.
8. `updateStudioAction` calls `invalidateDefaultLocaleCache()` alongside `revalidatePath()` to match the sibling `updateSiteSettingsAction`.
9. RU/BE translations are pinned inline in Task 9 (not delegated to the implementer).
10. Task 2's round-trip test is gated on `db != null` to match the existing defensive pattern in `db/site-settings.test.ts`.

---

## Task 1: DB schema — extend `siteSettings`

**Files:**
- Modify: [db/schema.ts](../../../db/schema.ts) — extend the `siteSettings` table starting around line 219, add CHECK constraints
- Create: `db/migrations/0011_studio_location.sql`

- [ ] **Step 1: Append columns to `siteSettings` in `db/schema.ts`**

Inside the existing `siteSettings = pgTable("site_settings", { ... }, (table) => ({ ... }))` block:

Add these column declarations after the existing `currency` line:
```ts
addressEn: text("address_en")
  .notNull()
  .default("By appointment · Verbena Lane 14, Studio B"),
addressRu: text("address_ru")
  .notNull()
  .default("По записи · Verbena Lane 14, Studio B"),
addressBe: text("address_be")
  .notNull()
  .default("Па запісу · Verbena Lane 14, Studio B"),
country: text("country").notNull().default("BY"),
cityEn: text("city_en").notNull().default(""),
cityRu: text("city_ru").notNull().default(""),
cityBe: text("city_be").notNull().default(""),
timezone: text("timezone").notNull().default("Europe/Minsk"),
latitude: doublePrecision("latitude"),
longitude: doublePrecision("longitude"),
mapVisible: boolean("map_visible").notNull().default(false),
```

Add `doublePrecision` to the existing `drizzle-orm/pg-core` import at the top of the file (alongside `boolean`, `integer`, etc.).

Add these CHECK constraints to the table's second-arg object (next to `singleton` and `discountRange`):
```ts
latRange: check(
  "site_settings_lat_range",
  sql`${table.latitude} IS NULL OR ${table.latitude} BETWEEN -90 AND 90`,
),
lngRange: check(
  "site_settings_lng_range",
  sql`${table.longitude} IS NULL OR ${table.longitude} BETWEEN -180 AND 180`,
),
```

- [ ] **Step 2: Generate the migration**

Run:
```bash
npx drizzle-kit generate
```

This should produce `db/migrations/0011_<adjective>_<noun>.sql` from the schema delta. Rename it to `0011_studio_location.sql` (keep both halves of the existing meta journal in sync — drizzle-kit updates `meta/_journal.json` and a `0011_snapshot.json` automatically).

Open the generated file. It should contain `ALTER TABLE "site_settings" ADD COLUMN ...` lines for each new column and the two `ADD CONSTRAINT ... CHECK (...)` lines. If anything is missing, edit the file to match the spec's §4.1 SQL block exactly.

- [ ] **Step 3: Apply the migration locally**

Run (your project uses Supabase / Postgres locally — check the existing migration scripts pattern in `package.json` if you're unsure; the masters migration was applied this way):
```bash
npx drizzle-kit migrate
```

Expected: no errors. New columns present. Verify with:
```bash
psql "$DATABASE_URL" -c "\d site_settings"
```

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/0011_studio_location.sql db/migrations/meta/
git commit -m "feat(db): extend site_settings with studio location columns"
```

---

## Task 2: DB read — extend `rowToSettings`

**Files:**
- Modify: [db/site-settings.ts](../../../db/site-settings.ts) — `rowToSettings()` around line 14
- Modify: [db/site-settings.test.ts](../../../db/site-settings.test.ts)

- [ ] **Step 1: Write failing tests**

Add to `db/site-settings.test.ts` (after the existing tests):

```ts
// Shape-only assertion that works whether DB is null (returns
// DEFAULT_SITE_SETTINGS) or live (returns the seeded row). Matches the
// existing defensive try/catch pattern in this file.
it("exposes the studio-location fields on the SiteSettings shape", async () => {
  let result: Awaited<ReturnType<typeof getSiteSettings>> | null = null;
  try {
    result = await getSiteSettings();
  } catch {
    /* pre-migration env — acceptable, fall through to defaults */
  }
  const s = result ?? DEFAULT_SITE_SETTINGS;
  expect(typeof s.addressEn).toBe("string");
  expect(typeof s.country).toBe("string");
  expect(typeof s.timezone).toBe("string");
  expect(s.latitude === null || typeof s.latitude === "number").toBe(true);
  expect(s.longitude === null || typeof s.longitude === "number").toBe(true);
  expect(typeof s.mapVisible).toBe("boolean");
});

it("frozen defaults match the studio-location columns", () => {
  expect(DEFAULT_SITE_SETTINGS.addressEn).toBe(
    "By appointment · Verbena Lane 14, Studio B",
  );
  expect(DEFAULT_SITE_SETTINGS.country).toBe("BY");
  expect(DEFAULT_SITE_SETTINGS.timezone).toBe("Europe/Minsk");
  expect(DEFAULT_SITE_SETTINGS.latitude).toBeNull();
  expect(DEFAULT_SITE_SETTINGS.longitude).toBeNull();
  expect(DEFAULT_SITE_SETTINGS.mapVisible).toBe(false);
});

// Gated on a live DB — mirrors the defensive try/catch the existing
// tests in this file use so CI / pre-migration environments still pass.
it.skipIf(!process.env.DATABASE_URL)(
  "round-trips a full studio-location patch (live DB only)",
  async () => {
    await updateSiteSettings(
      {
        addressEn: "12 Rose Street",
        addressRu: "12 Розовая",
        addressBe: "12 Ружовая",
        country: "BY",
        cityEn: "Borisov",
        cityRu: "Борисов",
        cityBe: "Барысаў",
        timezone: "Europe/Minsk",
        latitude: 54.231,
        longitude: 28.491,
        mapVisible: true,
      },
      null,
    );
    const settings = await getSiteSettings();
    expect(settings.cityEn).toBe("Borisov");
    expect(settings.latitude).toBeCloseTo(54.231, 4);
    expect(settings.longitude).toBeCloseTo(28.491, 4);
    expect(settings.mapVisible).toBe(true);
  },
);
```

- [ ] **Step 2: Verify the tests fail**

Run:
```bash
npx vitest run db/site-settings.test.ts
```
Expected: FAIL on both new tests (the type returned by `rowToSettings` doesn't yet include the new fields, OR the tests compile error because `SiteSettings` is missing fields). Compile errors are an acceptable "fail" — proceed to step 3.

- [ ] **Step 3: Extend `rowToSettings()`**

In `db/site-settings.ts`, replace `rowToSettings()` to map the new columns:

```ts
function rowToSettings(row: schema.SiteSettingsRow): SiteSettings {
  return {
    defaultPalette: row.defaultPalette as PaletteId,
    defaultLocale: row.defaultLocale as Locale,
    priceOverrides: row.priceOverrides ?? {},
    discountPercent: row.discountPercent,
    discountActive: row.discountActive,
    currency: row.currency,
    addressEn: row.addressEn,
    addressRu: row.addressRu,
    addressBe: row.addressBe,
    country: row.country,
    cityEn: row.cityEn,
    cityRu: row.cityRu,
    cityBe: row.cityBe,
    timezone: row.timezone,
    latitude: row.latitude,
    longitude: row.longitude,
    mapVisible: row.mapVisible,
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

Note: the test will still fail until Task 3 extends the `SiteSettings` type; the change here covers the DB-layer mapping. Don't run the tests yet — proceed to Task 3.

---

## Task 3: Entity types — extend `SiteSettings`

**Files:**
- Modify: [entities/site-settings/model/types.ts](../../../entities/site-settings/model/types.ts)

- [ ] **Step 1: Extend the `SiteSettings` interface**

Replace the existing interface and `DEFAULT_SITE_SETTINGS` with:

```ts
export interface SiteSettings {
  defaultPalette: PaletteId;
  defaultLocale: Locale;
  priceOverrides: Readonly<Record<string, number>>;
  discountPercent: number;
  discountActive: boolean;
  currency: CurrencyCode;
  addressEn: string;
  addressRu: string;
  addressBe: string;
  country: string;
  cityEn: string;
  cityRu: string;
  cityBe: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  mapVisible: boolean;
  updatedAt: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  defaultPalette: "aubergine" as PaletteId,
  defaultLocale: "en" as Locale,
  priceOverrides: Object.freeze({}),
  discountPercent: 0,
  discountActive: false,
  currency: "EUR" as CurrencyCode,
  addressEn: "By appointment · Verbena Lane 14, Studio B",
  addressRu: "По записи · Verbena Lane 14, Studio B",
  addressBe: "Па запісу · Verbena Lane 14, Studio B",
  country: "BY",
  cityEn: "",
  cityRu: "",
  cityBe: "",
  timezone: "Europe/Minsk",
  latitude: null,
  longitude: null,
  mapVisible: false,
  updatedAt: new Date(0).toISOString(),
});
```

- [ ] **Step 2: Verify the Task 2 tests now pass**

Run:
```bash
npx vitest run db/site-settings.test.ts
```
Expected: PASS for both new tests plus the existing ones.

- [ ] **Step 3: Commit Tasks 2 + 3 together**

```bash
git add db/site-settings.ts db/site-settings.test.ts entities/site-settings/model/types.ts
git commit -m "feat(site-settings): map studio-location columns into SiteSettings"
```

---

## Task 4: Country + timezone shared config

**Files:**
- Create: `shared/config/countries.ts` + `shared/config/countries.test.ts`
- Create: `shared/config/time-zones.ts` + `shared/config/time-zones.test.ts`

- [ ] **Step 1: Write the failing tests for countries**

`shared/config/countries.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { COUNTRIES, isValidCountryCode } from "./countries";

describe("countries", () => {
  it("contains Belarus, Russia, and the US as a baseline sanity check", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes).toContain("BY");
    expect(codes).toContain("RU");
    expect(codes).toContain("US");
  });

  it("is sorted alphabetically by English name", () => {
    const names = COUNTRIES.map((c) => c.nameEn);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("recognises valid alpha-2 codes via isValidCountryCode", () => {
    expect(isValidCountryCode("BY")).toBe(true);
    expect(isValidCountryCode("ZZ")).toBe(false);
    expect(isValidCountryCode("by")).toBe(false); // case-sensitive
  });
});
```

- [ ] **Step 2: Verify failure**

Run:
```bash
npx vitest run shared/config/countries.test.ts
```
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Implement `shared/config/countries.ts` (generate the list at module load)**

To keep the plan self-contained and avoid pasting 250 lines, derive the list from Node's built-in `Intl.DisplayNames`. The list is computed once at module load and frozen, so there's no per-render cost. Run this in a Node REPL once if you want to inspect / cache the output, but the runtime form below is what ships:

```ts
/**
 * ISO-3166 alpha-2 country list, sorted by English name.
 *
 * Derived from the standard alpha-2 codes plus Node's
 * Intl.DisplayNames for English country names. Computed once at
 * module load and frozen.
 *
 * Used by the studio-admin form to pick the studio's country.
 * Names render in the admin UI only (English); public site copy
 * never displays the country name directly.
 */
export interface CountryEntry {
  code: string;
  nameEn: string;
}

// All officially-assigned ISO-3166-1 alpha-2 codes as of 2026.
// (Verified against https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2.
// Reserved / transitional codes intentionally excluded.)
const ALPHA2_CODES: readonly string[] = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
];

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRIES: readonly CountryEntry[] = Object.freeze(
  ALPHA2_CODES.map((code) => ({
    code,
    nameEn: displayNames.of(code) ?? code,
  }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en"))
    .map((entry) => Object.freeze(entry)),
);

const CODE_SET = new Set(COUNTRIES.map((c) => c.code));

export function isValidCountryCode(code: string): boolean {
  return CODE_SET.has(code);
}

export type CountryCode = (typeof COUNTRIES)[number]["code"];
```

- [ ] **Step 4: Verify tests pass**

```bash
npx vitest run shared/config/countries.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write failing tests for time-zones**

`shared/config/time-zones.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getTimeZoneList, isValidTimeZone } from "./time-zones";

describe("time-zones", () => {
  it("returns a non-empty IANA list containing the studio default", () => {
    const list = getTimeZoneList();
    expect(list.length).toBeGreaterThan(100);
    expect(list).toContain("Europe/Minsk");
    expect(list).toContain("UTC");
  });

  it("caches the list across calls", () => {
    expect(getTimeZoneList()).toBe(getTimeZoneList());
  });

  it("accepts valid IANA zones and rejects garbage", () => {
    expect(isValidTimeZone("Europe/Minsk")).toBe(true);
    expect(isValidTimeZone("Europe/Atlantis")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
```

- [ ] **Step 6: Verify failure**

```bash
npx vitest run shared/config/time-zones.test.ts
```
Expected: FAIL — file doesn't exist.

- [ ] **Step 7: Implement `shared/config/time-zones.ts`**

```ts
/**
 * IANA timezone helpers backed by `Intl.supportedValuesOf("timeZone")`.
 * Node 18+ guarantees the API.
 */

let cached: readonly string[] | null = null;

export function getTimeZoneList(): readonly string[] {
  if (cached) return cached;
  cached = Object.freeze(Intl.supportedValuesOf("timeZone"));
  return cached;
}

const ZONE_SET = new Set(getTimeZoneList());

export function isValidTimeZone(tz: string): boolean {
  return ZONE_SET.has(tz);
}
```

- [ ] **Step 8: Verify tests pass**

```bash
npx vitest run shared/config/time-zones.test.ts
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add shared/config/countries.ts shared/config/countries.test.ts shared/config/time-zones.ts shared/config/time-zones.test.ts
git commit -m "feat(shared/config): ISO-3166 country list and IANA timezone helpers"
```

---

## Task 5: Patch schema — Zod validation for new fields

**Files:**
- Modify: [entities/site-settings/model/schema.ts](../../../entities/site-settings/model/schema.ts)
- Modify: [entities/site-settings/model/schema.test.ts](../../../entities/site-settings/model/schema.test.ts)

- [ ] **Step 1: Write failing tests**

Append to `entities/site-settings/model/schema.test.ts`:

```ts
describe("studio-location fields", () => {
  it("accepts a valid full patch", () => {
    const ok = siteSettingsPatchSchema.safeParse({
      addressEn: "12 Rose Street",
      addressRu: "12 Розовая",
      addressBe: "12 Ружовая",
      country: "BY",
      cityEn: "Borisov",
      cityRu: "Борисов",
      cityBe: "Барысаў",
      timezone: "Europe/Minsk",
      latitude: 54.231,
      longitude: 28.491,
      mapVisible: true,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects an unknown ISO country code", () => {
    const bad = siteSettingsPatchSchema.safeParse({ country: "ZZ" });
    expect(bad.success).toBe(false);
  });

  it("rejects out-of-range latitude", () => {
    expect(siteSettingsPatchSchema.safeParse({ latitude: 91 }).success).toBe(false);
    expect(siteSettingsPatchSchema.safeParse({ latitude: -91 }).success).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(siteSettingsPatchSchema.safeParse({ longitude: 181 }).success).toBe(false);
    expect(siteSettingsPatchSchema.safeParse({ longitude: -181 }).success).toBe(false);
  });

  it("rejects unknown IANA timezone", () => {
    const bad = siteSettingsPatchSchema.safeParse({ timezone: "Europe/Atlantis" });
    expect(bad.success).toBe(false);
  });

  it("rejects mapVisible:true when coords are null", () => {
    const bad = siteSettingsPatchSchema.safeParse({
      mapVisible: true,
      latitude: null,
      longitude: null,
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a half-pair lat/lng patch", () => {
    const half = siteSettingsPatchSchema.safeParse({
      latitude: 54.2,
      longitude: null,
    });
    expect(half.success).toBe(false);
  });

  it("accepts a fully-null coordinate patch (clearing coords)", () => {
    const ok = siteSettingsPatchSchema.safeParse({
      latitude: null,
      longitude: null,
      mapVisible: false,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects addresses longer than 200 chars", () => {
    const bad = siteSettingsPatchSchema.safeParse({ addressEn: "a".repeat(201) });
    expect(bad.success).toBe(false);
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run entities/site-settings/model/schema.test.ts
```
Expected: FAIL on all new cases.

- [ ] **Step 3: Extend `siteSettingsPatchSchema`**

Rewrite the schema (the existing `.partial()` shape is preserved; one outer `.superRefine` adds the cross-field invariants):

```ts
import { z } from "zod";
import { PALETTES } from "@/shared/config/palettes";
import { routing } from "@/i18n/routing";
import { COUNTRIES } from "@/shared/config/countries";
import { isValidTimeZone } from "@/shared/config/time-zones";

const PALETTE_IDS = PALETTES.map((p) => p.id) as [string, ...string[]];
const LOCALES = routing.locales as readonly string[] as [string, ...string[]];
const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

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
    currency: z.enum(["EUR", "USD", "BYN", "RUB"]),

    addressEn: z.string().max(200),
    addressRu: z.string().max(200),
    addressBe: z.string().max(200),
    country: z.enum(COUNTRY_CODES),
    cityEn: z.string().max(120),
    cityRu: z.string().max(120),
    cityBe: z.string().max(120),
    timezone: z.string().refine(isValidTimeZone, { message: "Unknown IANA timezone" }),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    mapVisible: z.boolean(),
  })
  .partial()
  .superRefine((patch, ctx) => {
    // Half-pair lat/lng: when either is present in the patch, both must be
    // present (either both numbers or both null).
    const hasLat = "latitude" in patch;
    const hasLng = "longitude" in patch;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude and longitude must be set together",
        path: hasLat ? ["longitude"] : ["latitude"],
      });
      return;
    }
    if (hasLat && hasLng) {
      const latNull = patch.latitude == null;
      const lngNull = patch.longitude == null;
      if (latNull !== lngNull) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "latitude and longitude must both be set or both be null",
          path: ["latitude"],
        });
      }
    }
    // mapVisible:true requires non-null coords in the same patch.
    if (patch.mapVisible === true) {
      if (patch.latitude == null || patch.longitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mapVisible requires latitude and longitude",
          path: ["mapVisible"],
        });
      }
    }
  });

export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;
```

- [ ] **Step 4: Verify tests pass**

```bash
npx vitest run entities/site-settings/model/schema.test.ts
```
Expected: PASS for all (including the legacy palette/currency cases).

- [ ] **Step 5: Commit**

```bash
git add entities/site-settings/model/schema.ts entities/site-settings/model/schema.test.ts
git commit -m "feat(site-settings): zod validation for studio-location patch"
```

---

## Task 6: Locale-aware field helpers

**Files:**
- Create: `entities/site-settings/model/locale-fields.ts` + `locale-fields.test.ts`
- Modify: [entities/site-settings/index.ts](../../../entities/site-settings/index.ts) — re-export

- [ ] **Step 1: Write failing tests**

`entities/site-settings/model/locale-fields.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./types";
import { cityForLocale, addressForLocale } from "./locale-fields";

const SAMPLE = {
  ...DEFAULT_SITE_SETTINGS,
  cityEn: "Borisov",
  cityRu: "Борисов",
  cityBe: "Барысаў",
  addressEn: "12 Rose Street",
  addressRu: "12 Розовая",
  addressBe: "12 Ружовая",
};

describe("cityForLocale", () => {
  it("returns the matching per-locale city", () => {
    expect(cityForLocale(SAMPLE, "en")).toBe("Borisov");
    expect(cityForLocale(SAMPLE, "ru")).toBe("Борисов");
    expect(cityForLocale(SAMPLE, "be")).toBe("Барысаў");
  });

  it("falls back to EN when the locale-specific city is empty", () => {
    expect(
      cityForLocale({ ...SAMPLE, cityRu: "" }, "ru"),
    ).toBe("Borisov");
  });

  it("returns empty string when every field is empty", () => {
    expect(cityForLocale(DEFAULT_SITE_SETTINGS, "ru")).toBe("");
  });
});

describe("addressForLocale", () => {
  it("returns the matching per-locale address", () => {
    expect(addressForLocale(SAMPLE, "be")).toBe("12 Ружовая");
  });

  it("falls back to EN when the locale-specific address is empty", () => {
    expect(
      addressForLocale({ ...SAMPLE, addressBe: "" }, "be"),
    ).toBe("12 Rose Street");
  });
});

describe("studioLocationLine", () => {
  it("returns 'address · city' when city is set", () => {
    expect(studioLocationLine(SAMPLE, "en")).toBe("12 Rose Street · Borisov");
    expect(studioLocationLine(SAMPLE, "ru")).toBe("12 Розовая · Борисов");
  });

  it("returns only the address when city is empty", () => {
    expect(
      studioLocationLine({ ...SAMPLE, cityEn: "", cityRu: "", cityBe: "" }, "en"),
    ).toBe("12 Rose Street");
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run entities/site-settings/model/locale-fields.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

`entities/site-settings/model/locale-fields.ts`:
```ts
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "./types";

export function cityForLocale(settings: SiteSettings, locale: Locale): string {
  const direct =
    locale === "ru"
      ? settings.cityRu
      : locale === "be"
        ? settings.cityBe
        : settings.cityEn;
  return direct || settings.cityEn;
}

export function addressForLocale(
  settings: SiteSettings,
  locale: Locale,
): string {
  const direct =
    locale === "ru"
      ? settings.addressRu
      : locale === "be"
        ? settings.addressBe
        : settings.addressEn;
  return direct || settings.addressEn;
}

/**
 * Composes the public-facing one-line address. Mirrors the home-footer
 * convention: `<address> · <city>` when a city is set, otherwise just
 * the address.
 */
export function studioLocationLine(
  settings: SiteSettings,
  locale: Locale,
): string {
  const address = addressForLocale(settings, locale);
  const city = cityForLocale(settings, locale);
  return city ? `${address} · ${city}` : address;
}
```

Re-export from `entities/site-settings/index.ts`:
```ts
export {
  cityForLocale,
  addressForLocale,
  studioLocationLine,
} from "./model/locale-fields";
```

- [ ] **Step 4: Verify tests pass**

```bash
npx vitest run entities/site-settings/model/locale-fields.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add entities/site-settings/model/locale-fields.ts entities/site-settings/model/locale-fields.test.ts entities/site-settings/index.ts
git commit -m "feat(site-settings): cityForLocale / addressForLocale helpers"
```

---

## Task 7: Server action — `updateStudioAction`

**Files:**
- Create: `features/studio-admin/api/update-studio.ts` + `update-studio.test.ts`
- Create: `features/studio-admin/index.ts`

- [ ] **Step 1: Write failing tests**

`features/studio-admin/api/update-studio.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/site-settings", () => ({
  updateSiteSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    ok: true,
    user: { id: "tg:1" },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateSiteSettings } from "@/db/site-settings";
import { requireAdmin } from "@/shared/lib/auth-server";
import { revalidatePath } from "next/cache";
import { updateStudioAction } from "./update-studio";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
});

describe("updateStudioAction", () => {
  it("persists a valid patch and revalidates the layout", async () => {
    const result = await updateStudioAction({
      addressEn: "12 Rose",
      country: "BY",
      cityEn: "Borisov",
      timezone: "Europe/Minsk",
      latitude: 54.231,
      longitude: 28.491,
      mapVisible: true,
    });
    expect(result).toEqual({ ok: true });
    expect(updateSiteSettings).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects an invalid patch", async () => {
    const result = await updateStudioAction({ latitude: 999 });
    expect(result.ok).toBe(false);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("refuses non-admin callers when auth is required", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      ok: false,
      reason: "forbidden",
    });
    const result = await updateStudioAction({ cityEn: "X" });
    expect(result.ok).toBe(false);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("skips the auth gate when TELEGRAM_BOT_TOKEN is unset (CI/dev)", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const result = await updateStudioAction({ cityEn: "Borisov" });
    expect(result).toEqual({ ok: true });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(updateSiteSettings).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run features/studio-admin/api/update-studio.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the action**

`features/studio-admin/api/update-studio.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { siteSettingsPatchSchema } from "@/entities/site-settings";
import { requireAdmin } from "@/shared/lib/auth-server";
import { updateSiteSettings } from "@/db/site-settings";
import { invalidateDefaultLocaleCache } from "@/shared/lib/site-settings-cache";

export type UpdateStudioResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateStudioAction(
  patch: unknown,
): Promise<UpdateStudioResult> {
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  let updatedBy: string | null = null;
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.reason };
    updatedBy = gate.user.id;
  }

  const parsed = siteSettingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  await updateSiteSettings(parsed.data, updatedBy);
  invalidateDefaultLocaleCache(); // same as updateSiteSettingsAction — keep in-proc cache fresh
  revalidatePath("/", "layout");
  return { ok: true };
}
```

> The test in Step 1 should also verify the cache-invalidation call. Add to the imports / mocks at the top:
> ```ts
> vi.mock("@/shared/lib/site-settings-cache", () => ({
>   invalidateDefaultLocaleCache: vi.fn(),
> }));
> // …
> import { invalidateDefaultLocaleCache } from "@/shared/lib/site-settings-cache";
> ```
> and to the first test:
> ```ts
> expect(invalidateDefaultLocaleCache).toHaveBeenCalledOnce();
> ```

`features/studio-admin/index.ts`:
```ts
export { updateStudioAction } from "./api/update-studio";
export type { UpdateStudioResult } from "./api/update-studio";
```

(Form export gets added in Task 8.)

- [ ] **Step 4: Verify tests pass**

```bash
npx vitest run features/studio-admin/api/update-studio.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/studio-admin/api/ features/studio-admin/index.ts
git commit -m "feat(studio-admin): updateStudioAction server action"
```

---

## Task 8: `<StudioForm>` UI — failing tests first

**Files:**
- Create: `features/studio-admin/ui/studio-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

`features/studio-admin/ui/studio-form.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { COUNTRIES } from "@/shared/config/countries";
import messages from "@/messages/en.json";
import { StudioForm } from "./studio-form";

const TIMEZONES = ["UTC", "Europe/Minsk", "Europe/Warsaw", "America/New_York"];

function renderForm(submit = vi.fn().mockResolvedValue({ ok: true })) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <StudioForm
        initial={DEFAULT_SITE_SETTINGS}
        countries={COUNTRIES}
        timeZones={TIMEZONES}
        onSubmit={submit}
      />
    </NextIntlClientProvider>,
  );
  return { submit };
}

describe("StudioForm", () => {
  it("renders the three address inputs and three city inputs", () => {
    renderForm();
    expect(screen.getByLabelText(/address.*english/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address.*russian/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address.*belarusian/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city.*english/i)).toBeInTheDocument();
  });

  it("disables the 'Show map' checkbox when latitude or longitude is empty", () => {
    renderForm();
    const checkbox = screen.getByRole("checkbox", { name: /show map/i });
    expect(checkbox).toBeDisabled();
  });

  it("enables the 'Show map' checkbox once both coords are filled", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/latitude/i), {
      target: { value: "54.231" },
    });
    fireEvent.change(screen.getByLabelText(/longitude/i), {
      target: { value: "28.491" },
    });
    expect(screen.getByRole("checkbox", { name: /show map/i })).not.toBeDisabled();
  });

  it("submits the patch shape and shows 'Saved' on success", async () => {
    const { submit } = renderForm();
    fireEvent.change(screen.getByLabelText(/city.*english/i), {
      target: { value: "Borisov" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledOnce();
    });
    const patch = submit.mock.calls[0][0];
    expect(patch.cityEn).toBe("Borisov");
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("displays the server error message on failure", async () => {
    const { submit } = renderForm(
      vi.fn().mockResolvedValue({ ok: false, error: "boom" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });

  it("warns via window.confirm when timezone is changed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();
    const select = screen.getByLabelText(/timezone/i);
    fireEvent.change(select, { target: { value: "America/New_York" } });
    expect(confirmSpy).toHaveBeenCalled();
    // confirm returned false → value should NOT have changed
    expect(select).toHaveValue("Europe/Minsk");
    confirmSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run features/studio-admin/ui/studio-form.test.tsx
```
Expected: FAIL — module not found.

---

## Task 9: `<StudioForm>` UI — minimal implementation

**Files:**
- Create: `features/studio-admin/ui/studio-form.tsx`
- Modify: `features/studio-admin/index.ts`

- [ ] **Step 1: Implement `<StudioForm>`**

`features/studio-admin/ui/studio-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import type {
  SiteSettings,
  SiteSettingsPatch,
} from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";
import type { CountryEntry } from "@/shared/config/countries";

export type SubmitStudioFn = (
  patch: SiteSettingsPatch,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface StudioFormProps {
  initial: SiteSettings;
  countries: readonly CountryEntry[];
  timeZones: readonly string[];
  onSubmit: SubmitStudioFn;
}

type Status =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function StudioForm({
  initial,
  countries,
  timeZones,
  onSubmit,
}: StudioFormProps) {
  const t = useTranslations("AdminStudio");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [addressEn, setAddressEn] = useState(initial.addressEn);
  const [addressRu, setAddressRu] = useState(initial.addressRu);
  const [addressBe, setAddressBe] = useState(initial.addressBe);
  const [country, setCountry] = useState(initial.country);
  const [cityEn, setCityEn] = useState(initial.cityEn);
  const [cityRu, setCityRu] = useState(initial.cityRu);
  const [cityBe, setCityBe] = useState(initial.cityBe);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [latitude, setLatitude] = useState(
    initial.latitude == null ? "" : String(initial.latitude),
  );
  const [longitude, setLongitude] = useState(
    initial.longitude == null ? "" : String(initial.longitude),
  );
  const [mapVisible, setMapVisible] = useState(initial.mapVisible);

  const latNum = latitude === "" ? null : Number(latitude);
  const lngNum = longitude === "" ? null : Number(longitude);
  const coordsBothFilled =
    latNum != null &&
    lngNum != null &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum);

  function handleTimezoneChange(next: string) {
    if (next === timezone) return;
    const ok = window.confirm(t("timezone_confirm"));
    if (ok) setTimezone(next);
  }

  function buildPatch(): SiteSettingsPatch {
    return {
      addressEn,
      addressRu,
      addressBe,
      country,
      cityEn,
      cityRu,
      cityBe,
      timezone,
      latitude: coordsBothFilled ? latNum : null,
      longitude: coordsBothFilled ? lngNum : null,
      mapVisible: coordsBothFilled ? mapVisible : false,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await onSubmit(buildPatch());
      if (result.ok) setStatus({ kind: "saved" });
      else setStatus({ kind: "error", message: result.error });
    });
  }

  const inputClass =
    "w-full rounded border border-line bg-surface px-2 py-1 text-[13px]";
  const labelClass =
    "block font-mono text-[10px] uppercase tracking-[0.18em] text-text-3";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 px-[22px] py-6"
    >
      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_address")}
        </legend>
        <div className="flex flex-col gap-3">
          <label className={labelClass}>
            {t("label_address_en")}
            <input
              maxLength={200}
              className={cn(inputClass, "mt-1")}
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_address_ru")}
            <input
              maxLength={200}
              className={cn(inputClass, "mt-1")}
              value={addressRu}
              onChange={(e) => setAddressRu(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_address_be")}
            <input
              maxLength={200}
              className={cn(inputClass, "mt-1")}
              value={addressBe}
              onChange={(e) => setAddressBe(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_country")}
        </legend>
        <label className={labelClass}>
          {t("label_country")}
          <select
            className={cn(inputClass, "mt-1")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn} ({c.code})
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_city")}
        </legend>
        <div className="flex flex-col gap-3">
          <label className={labelClass}>
            {t("label_city_en")}
            <input
              maxLength={120}
              className={cn(inputClass, "mt-1")}
              value={cityEn}
              onChange={(e) => setCityEn(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_city_ru")}
            <input
              maxLength={120}
              className={cn(inputClass, "mt-1")}
              value={cityRu}
              onChange={(e) => setCityRu(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_city_be")}
            <input
              maxLength={120}
              className={cn(inputClass, "mt-1")}
              value={cityBe}
              onChange={(e) => setCityBe(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_coords")}
        </legend>
        <p className="mb-2 text-[11px] text-text-3">{t("coords_hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            {t("label_latitude")}
            <input
              type="number"
              inputMode="decimal"
              step="any"
              className={cn(inputClass, "mt-1")}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_longitude")}
            <input
              type="number"
              inputMode="decimal"
              step="any"
              className={cn(inputClass, "mt-1")}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </label>
        </div>
        {coordsBothFilled ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lngNum}#map=17/${latNum}/${lngNum}`}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-block text-[11px] underline"
          >
            {t("preview_pin")}
          </a>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_timezone")}
        </legend>
        <label className={labelClass}>
          {t("label_timezone")}
          <select
            className={cn(inputClass, "mt-1")}
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
          >
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_map_visible")}
        </legend>
        <label
          className={cn(
            "flex items-center gap-2 text-[13px]",
            !coordsBothFilled && "opacity-50",
          )}
          title={coordsBothFilled ? undefined : t("map_visible_disabled_hint")}
        >
          <input
            type="checkbox"
            checked={mapVisible}
            disabled={!coordsBothFilled}
            onChange={(e) => setMapVisible(e.target.checked)}
          />
          {t("label_show_map")}
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("saved")}
          </span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-accent">
            {t("error", { error: status.message })}
          </span>
        ) : null}
      </div>
    </form>
  );
}
```

Re-export from `features/studio-admin/index.ts`:
```ts
export { updateStudioAction } from "./api/update-studio";
export type { UpdateStudioResult } from "./api/update-studio";
export { StudioForm } from "./ui/studio-form";
export type { StudioFormProps } from "./ui/studio-form";
```

- [ ] **Step 2: Add the i18n strings**

Append to `messages/en.json` (and analogous translations to `ru.json` / `be.json`):
```jsonc
"AdminStudio": {
  "meta_title": "Studio",
  "plate_title": "Studio",
  "section_address": "Address",
  "section_country": "Country",
  "section_city": "City / town",
  "section_coords": "Coordinates",
  "section_timezone": "Timezone",
  "section_map_visible": "Map",
  "label_address_en": "Address (English)",
  "label_address_ru": "Address (Russian)",
  "label_address_be": "Address (Belarusian)",
  "label_country": "Country",
  "label_city_en": "City (English)",
  "label_city_ru": "City (Russian)",
  "label_city_be": "City (Belarusian)",
  "label_latitude": "Latitude",
  "label_longitude": "Longitude",
  "label_timezone": "Timezone",
  "label_show_map": "Show map on home",
  "coords_hint": "Right-click your studio in Google Maps → click the coords to copy.",
  "preview_pin": "Preview the pin on OpenStreetMap →",
  "map_visible_disabled_hint": "Add coordinates first",
  "timezone_confirm": "Changing the timezone affects how upcoming booking times appear to guests. Continue?",
  "save": "Save",
  "saved": "Saved",
  "error": "Save failed: {error}"
}
```

RU (`messages/ru.json`):
```jsonc
"AdminStudio": {
  "meta_title": "Студия",
  "plate_title": "Студия",
  "section_address": "Адрес",
  "section_country": "Страна",
  "section_city": "Город",
  "section_coords": "Координаты",
  "section_timezone": "Часовой пояс",
  "section_map_visible": "Карта",
  "label_address_en": "Адрес (английский)",
  "label_address_ru": "Адрес (русский)",
  "label_address_be": "Адрес (белорусский)",
  "label_country": "Страна",
  "label_city_en": "Город (английский)",
  "label_city_ru": "Город (русский)",
  "label_city_be": "Город (белорусский)",
  "label_latitude": "Широта",
  "label_longitude": "Долгота",
  "label_timezone": "Часовой пояс",
  "label_show_map": "Показывать карту на главной",
  "coords_hint": "В Google Maps щёлкните правой кнопкой по студии → нажмите на координаты, чтобы скопировать.",
  "preview_pin": "Посмотреть метку в OpenStreetMap →",
  "map_visible_disabled_hint": "Сначала введите координаты",
  "timezone_confirm": "Смена часового пояса повлияет на время записи у гостей. Продолжить?",
  "save": "Сохранить",
  "saved": "Сохранено",
  "error": "Не удалось сохранить: {error}"
}
```

BE (`messages/be.json`):
```jsonc
"AdminStudio": {
  "meta_title": "Студыя",
  "plate_title": "Студыя",
  "section_address": "Адрас",
  "section_country": "Краіна",
  "section_city": "Горад",
  "section_coords": "Каардынаты",
  "section_timezone": "Часавы пояс",
  "section_map_visible": "Карта",
  "label_address_en": "Адрас (англійская)",
  "label_address_ru": "Адрас (руская)",
  "label_address_be": "Адрас (беларуская)",
  "label_country": "Краіна",
  "label_city_en": "Горад (англійская)",
  "label_city_ru": "Горад (руская)",
  "label_city_be": "Горад (беларуская)",
  "label_latitude": "Шырата",
  "label_longitude": "Даўгата",
  "label_timezone": "Часавы пояс",
  "label_show_map": "Паказваць карту на галоўнай",
  "coords_hint": "У Google Maps пстрыкніце правай кнопкай па студыі → націсніце на каардынаты, каб скапіяваць.",
  "preview_pin": "Паглядзець метку ў OpenStreetMap →",
  "map_visible_disabled_hint": "Спачатку ўвядзіце каардынаты",
  "timezone_confirm": "Змена часавага пояса паўплывае на час запісу для гасцей. Працягнуць?",
  "save": "Захаваць",
  "saved": "Захавана",
  "error": "Не атрымалася захаваць: {error}"
}
```

Also append `Admin.inbox_studio` + `Admin.inbox_studio_caption` for the dashboard tile (used in Task 12):
- EN: `"inbox_studio": "Studio"`, `"inbox_studio_caption": "Address, map, timezone"`
- RU: `"inbox_studio": "Студия"`, `"inbox_studio_caption": "Адрес, карта, часовой пояс"`
- BE: `"inbox_studio": "Студыя"`, `"inbox_studio_caption": "Адрас, карта, часавы пояс"`

- [ ] **Step 3: Verify tests pass**

```bash
npx vitest run features/studio-admin/ui/studio-form.test.tsx
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add features/studio-admin/ features/studio-admin/index.ts messages/en.json messages/ru.json messages/be.json
git commit -m "feat(studio-admin): StudioForm + AdminStudio i18n strings"
```

---

## Task 10: `<StudioForm>` Storybook story

**Files:**
- Create: `features/studio-admin/ui/studio-form.stories.tsx`

- [ ] **Step 1: Write the stories**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { COUNTRIES } from "@/shared/config/countries";
import messages from "@/messages/en.json";
import { StudioForm } from "./studio-form";

const meta: Meta<typeof StudioForm> = {
  title: "Features / Studio Admin / Studio Form",
  component: StudioForm,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StudioForm>;

const TIMEZONES = ["UTC", "Europe/Minsk", "Europe/Warsaw", "America/New_York"];

export const Empty: Story = {
  args: {
    initial: DEFAULT_SITE_SETTINGS,
    countries: COUNTRIES,
    timeZones: TIMEZONES,
    onSubmit: async () => ({ ok: true }),
  },
};

export const Populated: Story = {
  args: {
    initial: {
      ...DEFAULT_SITE_SETTINGS,
      cityEn: "Borisov",
      cityRu: "Борисов",
      cityBe: "Барысаў",
      latitude: 54.231,
      longitude: 28.491,
      mapVisible: true,
    },
    countries: COUNTRIES,
    timeZones: TIMEZONES,
    onSubmit: async () => ({ ok: true }),
  },
};

export const ErrorState: Story = {
  args: {
    initial: DEFAULT_SITE_SETTINGS,
    countries: COUNTRIES,
    timeZones: TIMEZONES,
    onSubmit: async () => ({ ok: false, error: "Something exploded" }),
  },
};
```

- [ ] **Step 2: Run the Storybook test project (every story is a test)**

```bash
npx vitest run --project=storybook features/studio-admin/ui/studio-form.stories.tsx
```
Expected: PASS (all three stories render without crashing).

- [ ] **Step 3: Commit**

```bash
git add features/studio-admin/ui/studio-form.stories.tsx
git commit -m "feat(studio-admin): StudioForm Storybook stories"
```

---

## Task 11: `<StudioMap>` widget

**Files:**
- Create: `widgets/studio-map/index.ts`
- Create: `widgets/studio-map/ui/studio-map.tsx` + `.test.tsx` + `.stories.tsx`

**Component design note:** `<StudioMap>` is sync (NOT an async server component) and takes a `dictionary` prop containing the three i18n strings it needs. The footer (server component) calls `useTranslations()` and passes the strings down. This keeps the widget trivially testable in jsdom.

- [ ] **Step 1: Write failing tests**

`widgets/studio-map/ui/studio-map.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { StudioMap } from "./studio-map";

const DICT = {
  mapAria: "Studio location",
  mapTitle: "Studio location",
  getDirections: "Get directions",
};

describe("StudioMap", () => {
  it("renders nothing when mapVisible is false", () => {
    const { container } = render(
      <StudioMap settings={DEFAULT_SITE_SETTINGS} dictionary={DICT} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when coords are null even with mapVisible true", () => {
    const { container } = render(
      <StudioMap
        settings={{ ...DEFAULT_SITE_SETTINGS, mapVisible: true }}
        dictionary={DICT}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders an OSM iframe and a Google Maps directions link when enabled", () => {
    const { getByTitle, getByRole } = render(
      <StudioMap
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          mapVisible: true,
          latitude: 54.231,
          longitude: 28.491,
        }}
        dictionary={DICT}
      />,
    );
    const iframe = getByTitle(/studio location/i);
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("src")).toContain("openstreetmap.org/export/embed.html");
    expect(iframe.getAttribute("src")).toContain("marker=54.231,28.491");
    expect(iframe).toHaveAttribute("loading", "lazy");

    const link = getByRole("link", { name: /get directions/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=54.231,28.491",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run widgets/studio-map/ui/studio-map.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `<StudioMap>` (sync, dictionary prop)**

`widgets/studio-map/ui/studio-map.tsx`:
```tsx
import type { SiteSettings } from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";

export interface StudioMapDictionary {
  mapAria: string;
  mapTitle: string;
  getDirections: string;
}

export interface StudioMapProps {
  settings: SiteSettings;
  dictionary: StudioMapDictionary;
}

const BBOX_DELTA = 0.005; // ~500m at typical latitudes

export function StudioMap({ settings, dictionary }: StudioMapProps) {
  if (!settings.mapVisible) return null;
  if (settings.latitude == null || settings.longitude == null) return null;

  const lat = settings.latitude;
  const lng = settings.longitude;
  const minLat = lat - BBOX_DELTA;
  const maxLat = lat + BBOX_DELTA;
  const minLng = lng - BBOX_DELTA;
  const maxLng = lng + BBOX_DELTA;

  const embedSrc =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${minLng},${minLat},${maxLng},${maxLat}` +
    `&layer=mapnik` +
    `&marker=${lat},${lng}`;
  const directionsHref =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <section
      aria-label={dictionary.mapAria}
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col items-center gap-2"
    >
      <iframe
        title={dictionary.mapTitle}
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-[16/9] w-full rounded border-[0.5px] border-line"
      />
      <a
        href={directionsHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
      >
        {dictionary.getDirections}
      </a>
    </section>
  );
}
```

`widgets/studio-map/index.ts`:
```ts
export { StudioMap } from "./ui/studio-map";
export type {
  StudioMapDictionary,
  StudioMapProps,
} from "./ui/studio-map";
```

- [ ] **Step 4: Verify tests pass**

```bash
npx vitest run widgets/studio-map/ui/studio-map.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Write the Storybook story**

`widgets/studio-map/ui/studio-map.stories.tsx`:
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { StudioMap } from "./studio-map";

const DICT = {
  mapAria: "Studio location",
  mapTitle: "Studio location",
  getDirections: "Get directions",
};

const meta: Meta<typeof StudioMap> = {
  title: "Widgets / Studio Map",
  component: StudioMap,
};
export default meta;
type Story = StoryObj<typeof StudioMap>;

export const Hidden: Story = {
  args: { settings: DEFAULT_SITE_SETTINGS, dictionary: DICT },
};

export const NoCoords: Story = {
  args: {
    settings: { ...DEFAULT_SITE_SETTINGS, mapVisible: true },
    dictionary: DICT,
  },
};

export const Visible: Story = {
  args: {
    settings: {
      ...DEFAULT_SITE_SETTINGS,
      mapVisible: true,
      latitude: 54.231,
      longitude: 28.491,
    },
    dictionary: DICT,
  },
};
```

- [ ] **Step 6: Run stories as tests**

```bash
npx vitest run --project=storybook widgets/studio-map/ui/studio-map.stories.tsx
```
Expected: PASS.

- [ ] **Step 7: Add the Footer i18n keys**

Append to each `messages/{en,ru,be}.json`:
```jsonc
"Footer": {
  "map_aria": "Studio location",
  "map_title": "Studio location",
  "get_directions": "Get directions"
}
```
RU: "Расположение студии" / "Проложить маршрут". BE: "Размяшчэнне студыі" / "Пракласці маршрут".

- [ ] **Step 8: Commit**

```bash
git add widgets/studio-map/ messages/en.json messages/ru.json messages/be.json
git commit -m "feat(studio-map): OSM iframe widget + Google Maps directions link"
```

---

## Task 12: Admin route `/admin/studio` + inbox tile

**Files:**
- Create: `app/[locale]/admin/studio/page.tsx`
- Modify: `app/[locale]/admin/page.tsx` — add "Studio" tile

- [ ] **Step 1: Create the admin route**

`app/[locale]/admin/studio/page.tsx`:
```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { getSiteSettings } from "@/db/site-settings";
import { AppHeader } from "@/widgets/app-header";
import {
  StudioForm,
  updateStudioAction,
} from "@/features/studio-admin";
import { COUNTRIES } from "@/shared/config/countries";
import { getTimeZoneList } from "@/shared/config/time-zones";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminStudio" });
  return { title: `Violetta — ${t("plate_title")}` };
}

export default async function AdminStudioRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  setRequestLocale(locale);

  const t = await getTranslations("AdminStudio");
  const settings = await getSiteSettings();

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />
      <StudioForm
        initial={settings}
        countries={COUNTRIES}
        timeZones={getTimeZoneList()}
        onSubmit={updateStudioAction}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add the inbox tile**

In `app/[locale]/admin/page.tsx`, insert a new `<li>` in the `<ul className="grid grid-cols-2 gap-3">` block — place it next to the existing `inbox_site_settings` tile (after it, so the page reads "Site settings → Studio"):

```tsx
<li>
  <Link
    href="/admin/studio"
    className="gilded block rounded-[18px] p-5 transition-colors duration-fast ease-out hover:bg-surface-2"
  >
    <div className="font-display text-[16px] italic">{t("inbox_studio")}</div>
    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
      {t("inbox_studio_caption")}
    </div>
  </Link>
</li>
```

Make sure these keys exist in `messages/{en,ru,be}.json` under `Admin`:
- `inbox_studio`: "Studio"
- `inbox_studio_caption`: "Address, map, timezone"

(They should already have been added in Task 9, Step 2; if not, add now.)

- [ ] **Step 3: Smoke-test the route**

Boot the dev server and visit `http://localhost:3000/en/admin/studio` — the form should render with default values pre-populated. Save with a valid lat/lng and check `psql "$DATABASE_URL" -c "select latitude, longitude, map_visible from site_settings"`.

- [ ] **Step 4: Commit**

```bash
git add 'app/[locale]/admin/studio/' 'app/[locale]/admin/page.tsx' messages/en.json messages/ru.json messages/be.json
git commit -m "feat(admin): /admin/studio route + dashboard tile"
```

---

## Task 13: Public surface — three call sites switch from `STUDIO_DATA.address` to settings

**Files:**
- Modify: [views/home/ui/sections/home-footer.tsx](../../../views/home/ui/sections/home-footer.tsx) — accept `settings` + `locale`, mount `<StudioMap>`, use `studioLocationLine()`
- Modify: [views/home/ui/home-page.tsx](../../../views/home/ui/home-page.tsx) — accept `settings` + `locale`, thread to `HomeFooter`
- Modify: `app/[locale]/home/page.tsx` (home route — note `[locale]/page.tsx` is just a `/welcome` redirect) — load settings, pass to `<HomePage>`
- Modify: [views/booking/ui/steps/confirm-step.tsx](../../../views/booking/ui/steps/confirm-step.tsx) — accept `location` prop, drop `STUDIO_DATA` import
- Modify: the booking step server route that renders `<ConfirmStep>` — load settings, compute `studioLocationLine(settings, locale)`, pass as `location`
- Modify: [views/confirmation/ui/confirmation-page.tsx](../../../views/confirmation/ui/confirmation-page.tsx) — accept `location` prop, drop `STUDIO_DATA` import
- Modify: [app/[locale]/booking/confirmation/page.tsx](../../../app/[locale]/booking/confirmation/page.tsx) — load settings, pass `location` to `<ConfirmationPage>`
- Modify: [entities/studio/model/data.ts](../../../entities/studio/model/data.ts) — delete `studio.address` field
- Modify: [entities/studio/model/types.ts](../../../entities/studio/model/types.ts) — delete `address` from `StudioInfo`
- Create: `views/home/ui/sections/home-footer.test.tsx`

> **Why atomic:** TypeScript will fail to compile the moment `studio.address` is deleted from `StudioInfo` if any consumer still reads it. The three rewrites (footer + confirm-step + confirmation-page) and the type/data deletion must land in one commit. The order below writes the new props first, switches each consumer, then drops the field last.

- [ ] **Step 1: Write failing test for the footer**

`views/home/ui/sections/home-footer.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import messages from "@/messages/en.json";
import { HomeFooter } from "./home-footer";

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("HomeFooter", () => {
  it("renders the per-locale address from settings", () => {
    const { getByText } = render(
      wrap(<HomeFooter settings={DEFAULT_SITE_SETTINGS} locale="en" />),
    );
    expect(
      getByText("By appointment · Verbena Lane 14, Studio B"),
    ).toBeInTheDocument();
  });

  it("appends city to the address line when city is set", () => {
    const { getByText } = render(
      wrap(
        <HomeFooter
          settings={{ ...DEFAULT_SITE_SETTINGS, cityEn: "Borisov" }}
          locale="en"
        />,
      ),
    );
    expect(
      getByText(/By appointment · Verbena Lane 14, Studio B · Borisov/),
    ).toBeInTheDocument();
  });

  it("does not render the map when mapVisible is false", () => {
    const { queryByRole } = render(
      wrap(<HomeFooter settings={DEFAULT_SITE_SETTINGS} locale="en" />),
    );
    expect(queryByRole("link", { name: /get directions/i })).toBeNull();
  });

  it("renders the map when mapVisible is true and coords are set", () => {
    const { getByRole } = render(
      wrap(
        <HomeFooter
          settings={{
            ...DEFAULT_SITE_SETTINGS,
            mapVisible: true,
            latitude: 54.231,
            longitude: 28.491,
          }}
          locale="en"
        />,
      ),
    );
    expect(getByRole("link", { name: /get directions/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run views/home/ui/sections/home-footer.test.tsx
```
Expected: FAIL — the current `HomeFooter` takes no props.

- [ ] **Step 3: Rewrite `home-footer.tsx`**

```tsx
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/entities/site-settings";
import { addressForLocale, cityForLocale } from "@/entities/site-settings";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { Ornament } from "@/shared/ui/ornament";
import { StudioMap } from "@/widgets/studio-map";

export interface HomeFooterProps {
  settings: SiteSettings;
  locale: Locale;
}

export function HomeFooter({ settings, locale }: HomeFooterProps) {
  const t = useTranslations("Home");
  const tFooter = useTranslations("Footer");

  const address = addressForLocale(settings, locale);
  const city = cityForLocale(settings, locale);
  const addressLine = city ? `${address} · ${city}` : address;

  return (
    <footer className="px-[22px] pb-7 pt-10 text-center text-text-3">
      <Ornament />
      <div className="mt-6 flex flex-col items-center gap-3">
        <MonogramSeal letter="V" className="size-10 text-[20px]" />
        <div className="font-display text-[22px] font-light italic">
          Violetta.
        </div>
      </div>
      <StudioMap
        settings={settings}
        dictionary={{
          mapAria: tFooter("map_aria"),
          mapTitle: tFooter("map_title"),
          getDirections: tFooter("get_directions"),
        }}
      />
      <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.32em]">
        {addressLine}
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.32em]">
        {t("footer_copyright")}
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Update `home-page.tsx`**

`views/home/ui/home-page.tsx` — add `settings` + `locale` to `HomePageProps`, thread to `<HomeFooter>`:

```tsx
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/entities/site-settings";
// …other existing imports…

export interface HomePageProps {
  master?: Master;
  settings: SiteSettings;
  locale: Locale;
}

export function HomePage({ master, settings, locale }: HomePageProps) {
  return (
    <div className="pb-28">
      <AppHeader />
      <AtelierHours />
      {/* …unchanged sections… */}
      <HomeFooter settings={settings} locale={locale} />
      <TabBar />
    </div>
  );
}
```

- [ ] **Step 5: Update the home route to pass props**

`app/[locale]/home/page.tsx` (NOT `[locale]/page.tsx` — that one's a `/welcome` redirect):

```tsx
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
// …existing imports…

export default async function HomeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [masters, settings] = await Promise.all([
    loadMastersForLocale(locale as Locale, { publishedOnly: true }),
    getSiteSettingsServer(),
  ]);
  return (
    <HomePage
      master={masters[0]}
      settings={settings}
      locale={locale as Locale}
    />
  );
}
```

- [ ] **Step 6: Update `<ConfirmStep>` (booking step) to take `location` prop**

In `views/booking/ui/steps/confirm-step.tsx`:
1. Delete the `import { STUDIO_DATA } from "@/entities/studio";` line.
2. Add `location: string` to `ConfirmStepProps`.
3. In the `rows` array, replace `STUDIO_DATA.studio.address` with the `location` prop.

The server parent that renders `<ConfirmStep>` is `app/[locale]/booking/[step]/page.tsx`. Find it (`grep -n ConfirmStep app/...`), load settings, and pass:

```tsx
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { studioLocationLine } from "@/entities/site-settings";
// …
const settings = await getSiteSettingsServer();
const location = studioLocationLine(settings, locale as Locale);
// …pass `location={location}` to <ConfirmStep />
```

- [ ] **Step 7: Update `<ConfirmationPage>` to take `location` prop**

In `views/confirmation/ui/confirmation-page.tsx`:
1. Delete the `import { STUDIO_DATA } from "@/entities/studio";` line.
2. Add `location: string` to `ConfirmationPageProps`.
3. In the `rows` array, replace `STUDIO_DATA.studio.address` with `props.location`.

In `app/[locale]/booking/confirmation/page.tsx`, load settings (likely already loaded for the timezone change in Task 14, so reuse), compute `studioLocationLine(settings, locale)`, and pass as `location` to `<ConfirmationPage>`.

- [ ] **Step 8: Remove the dead `studio.address` field**

In [entities/studio/model/data.ts](../../../entities/studio/model/data.ts), remove the `address` line from the `studio` object literal.

In [entities/studio/model/types.ts](../../../entities/studio/model/types.ts), remove the `address` field from the `StudioInfo` interface.

Verify no other consumer remains:
```bash
grep -rn "studio.address\|studio\.address" --include='*.ts' --include='*.tsx'
```
Expected: only test files (`views/home/ui/sections/home-footer.test.tsx`) which reference the literal default-seeded string — not the `STUDIO_DATA.studio.address` access.

- [ ] **Step 9: Run the full test + lint pass**

```bash
npm run lint && npm test
```
Expected: PASS. If TypeScript shouts, follow the trail.

- [ ] **Step 10: Commit**

```bash
git add views/home/ views/booking/ui/steps/confirm-step.tsx views/confirmation/ui/confirmation-page.tsx 'app/[locale]/home/page.tsx' 'app/[locale]/booking/' entities/studio/model/
git commit -m "feat(studio): route address through site settings everywhere; drop STUDIO_DATA.address"
```

---

## Task 14: Booking timezone — split helpers and route through settings

**Files:**
- Modify: [shared/lib/google-calendar/working-hours.ts](../../../shared/lib/google-calendar/working-hours.ts)
- Modify: [shared/lib/google-calendar/index.ts](../../../shared/lib/google-calendar/index.ts)
- Modify: [views/booking/api/submit.ts](../../../views/booking/api/submit.ts)
- Modify: [app/[locale]/booking/confirmation/page.tsx](../../../app/[locale]/booking/confirmation/page.tsx)
- Modify: [app/[locale]/admin/bookings/page.tsx](../../../app/[locale]/admin/bookings/page.tsx)
- Modify: [app/api/booking/slots/route.ts](../../../app/api/booking/slots/route.ts)

- [ ] **Step 1: Split the helper**

Rewrite `shared/lib/google-calendar/working-hours.ts`:
```ts
import type { SiteSettings } from "@/entities/site-settings";
import type { WorkingWindow } from "./types";

export const WEEKLY_DEFAULT_HOURS: WorkingWindow[] = [
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00" },
  { dayOfWeek: 6, startTime: "10:00", endTime: "19:00" },
];

export const DEFAULT_TIMEZONE = "Europe/Minsk";

/**
 * Returns the studio timezone from saved settings. Use this when you
 * already have settings in scope — every server context that talks to
 * the booking flow loads them anyway.
 */
export function bookingTimeZoneFromSettings(settings: SiteSettings): string {
  return settings.timezone || DEFAULT_TIMEZONE;
}

/**
 * Returns the timezone from environment / hardcoded default. Use only
 * when settings are not (and cannot be) loaded — e.g. unit fixtures
 * or build-time SSG paths without DB access.
 */
export function bookingTimeZoneFallback(): string {
  return process.env.NEXT_PUBLIC_BOOKING_TIMEZONE ?? DEFAULT_TIMEZONE;
}

/** @deprecated use `bookingTimeZoneFromSettings` or `bookingTimeZoneFallback`. */
export function bookingTimeZone(): string {
  return bookingTimeZoneFallback();
}
```

- [ ] **Step 2: Re-export from the slice barrel**

In `shared/lib/google-calendar/index.ts`, add:
```ts
export {
  bookingTimeZone,
  bookingTimeZoneFromSettings,
  bookingTimeZoneFallback,
  DEFAULT_TIMEZONE,
  WEEKLY_DEFAULT_HOURS,
} from "./working-hours";
```

- [ ] **Step 3: Update each caller**

For each of the four call sites, replace `bookingTimeZone()` with `bookingTimeZoneFromSettings(settings)` after loading `settings` via `getSiteSettingsServer()`:

- `views/booking/api/submit.ts:131` — already a server action; insert `const settings = await getSiteSettingsServer();` before the existing `const tz = bookingTimeZone();` line.
- `app/[locale]/booking/confirmation/page.tsx:67` — server component; load settings near where it loads other data.
- `app/[locale]/admin/bookings/page.tsx:65` — server component; load settings near `listBookingsForAdmin()`.
- `app/api/booking/slots/route.ts:29` — route handler; load settings at the top.

Add `import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";` to each file.

- [ ] **Step 4: Run lint + tests**

```bash
npm run lint && npm test
```
Expected: PASS. Any remaining call to `bookingTimeZone()` is fine (it's still exported, deprecated), but `grep -rn "bookingTimeZone\b" --include='*.ts' --include='*.tsx' | grep -v "shared/lib/google-calendar"` should be empty after the migration.

- [ ] **Step 5: Commit**

```bash
git add shared/lib/google-calendar/ views/booking/api/submit.ts 'app/[locale]/booking/confirmation/page.tsx' 'app/[locale]/admin/bookings/page.tsx' app/api/booking/slots/route.ts
git commit -m "refactor(booking): route studio timezone through site settings"
```

---

## Task 15: LocalBusiness JSON-LD

**Files:**
- Create: `shared/ui/local-business-jsonld/index.ts`
- Create: `shared/ui/local-business-jsonld/local-business-jsonld.tsx` + `.test.tsx` + `.stories.tsx`

- [ ] **Step 1: Write failing tests**

`shared/ui/local-business-jsonld/local-business-jsonld.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { LocalBusinessJsonLd } from "./local-business-jsonld";

const BASE_PROPS = {
  name: "Violetta Beauty",
  siteUrl: "https://violetta.example.com",
  locale: "en" as const,
};

function getJson(html: HTMLElement) {
  const script = html.querySelector('script[type="application/ld+json"]');
  if (!script) throw new Error("JSON-LD script not found");
  return JSON.parse(script.textContent ?? "");
}

describe("LocalBusinessJsonLd", () => {
  it("emits the minimal valid LocalBusiness when no address is set", () => {
    const { container } = render(
      <LocalBusinessJsonLd settings={DEFAULT_SITE_SETTINGS} {...BASE_PROPS} />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data["@type"]).toBe("BeautySalon");
    expect(data.name).toBe("Violetta Beauty");
    expect(data.url).toBe("https://violetta.example.com/en");
    expect(data.address).toBeUndefined();
    expect(data.geo).toBeUndefined();
  });

  it("includes the address block when address+country are set", () => {
    const { container } = render(
      <LocalBusinessJsonLd
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          addressEn: "12 Rose",
          cityEn: "Borisov",
        }}
        {...BASE_PROPS}
      />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "12 Rose",
      addressLocality: "Borisov",
      addressCountry: "BY",
    });
  });

  it("includes the geo block only when both coords are present", () => {
    const { container } = render(
      <LocalBusinessJsonLd
        settings={{
          ...DEFAULT_SITE_SETTINGS,
          latitude: 54.231,
          longitude: 28.491,
        }}
        {...BASE_PROPS}
      />,
    );
    const data = getJson(container as unknown as HTMLElement);
    expect(data.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 54.231,
      longitude: 28.491,
    });
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run shared/ui/local-business-jsonld/local-business-jsonld.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

`shared/ui/local-business-jsonld/local-business-jsonld.tsx`:
```tsx
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/entities/site-settings";
import { addressForLocale, cityForLocale } from "@/entities/site-settings";

export interface LocalBusinessJsonLdProps {
  settings: SiteSettings;
  locale: Locale;
  siteUrl: string;
  name: string;
}

export function LocalBusinessJsonLd({
  settings,
  locale,
  siteUrl,
  name,
}: LocalBusinessJsonLdProps) {
  const street = addressForLocale(settings, locale);
  const city = cityForLocale(settings, locale);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name,
    url: `${siteUrl}/${locale}`,
  };

  if (street && settings.country) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: street,
      ...(city ? { addressLocality: city } : {}),
      addressCountry: settings.country,
    };
  }

  if (settings.latitude != null && settings.longitude != null) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: settings.latitude,
      longitude: settings.longitude,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

`shared/ui/local-business-jsonld/index.ts`:
```ts
export { LocalBusinessJsonLd } from "./local-business-jsonld";
export type { LocalBusinessJsonLdProps } from "./local-business-jsonld";
```

Wait — the first test asserts that the default-settings render has no address (because `addressEn` defaults to the "By appointment · …" string, but the spec wants the address block to render iff there's a real address). Two reconciling options:

- **Option A (chosen):** the test's "minimal" case uses `DEFAULT_SITE_SETTINGS` whose `country` is `"BY"` and `addressEn` is non-empty → the address block IS emitted. Update the first test to assert it IS emitted in the default case, and add a separate test where address strings are explicitly empty to assert the address block is omitted.
- **Option B:** treat the default address string as a placeholder and gate emission on more than emptiness. More complex; the spec doesn't justify it.

**Use Option A.** Update the first test:
```ts
it("emits a LocalBusiness with the default seeded address", () => {
  const { container } = render(
    <LocalBusinessJsonLd settings={DEFAULT_SITE_SETTINGS} {...BASE_PROPS} />,
  );
  const data = getJson(container as unknown as HTMLElement);
  expect(data["@type"]).toBe("BeautySalon");
  expect(data.address).toBeDefined();
  expect(data.geo).toBeUndefined();
});

it("omits address when all address strings are blank", () => {
  const { container } = render(
    <LocalBusinessJsonLd
      settings={{
        ...DEFAULT_SITE_SETTINGS,
        addressEn: "",
        addressRu: "",
        addressBe: "",
      }}
      {...BASE_PROPS}
    />,
  );
  const data = getJson(container as unknown as HTMLElement);
  expect(data.address).toBeUndefined();
});
```

- [ ] **Step 4: Verify tests pass**

```bash
npx vitest run shared/ui/local-business-jsonld/local-business-jsonld.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Storybook**

`shared/ui/local-business-jsonld/local-business-jsonld.stories.tsx`:
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { LocalBusinessJsonLd } from "./local-business-jsonld";

const meta: Meta<typeof LocalBusinessJsonLd> = {
  title: "Shared / Local Business JSON-LD",
  component: LocalBusinessJsonLd,
};
export default meta;
type Story = StoryObj<typeof LocalBusinessJsonLd>;

const BASE = {
  name: "Violetta Beauty",
  siteUrl: "https://violetta.example.com",
  locale: "en" as const,
};

export const SeededDefault: Story = {
  args: { settings: DEFAULT_SITE_SETTINGS, ...BASE },
};

export const WithCoords: Story = {
  args: {
    settings: {
      ...DEFAULT_SITE_SETTINGS,
      cityEn: "Borisov",
      latitude: 54.231,
      longitude: 28.491,
    },
    ...BASE,
  },
};
```

Run:
```bash
npx vitest run --project=storybook shared/ui/local-business-jsonld/
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/ui/local-business-jsonld/
git commit -m "feat(seo): LocalBusiness JSON-LD component"
```

---

## Task 16: Locale layout — templated metadata + JSON-LD mount

**Files:**
- Modify: [app/[locale]/layout.tsx](../../../app/[locale]/layout.tsx)
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json` — add the three `Site.*_with_city` keys

- [ ] **Step 1: Add the i18n keys**

In each of `messages/en.json`, `messages/ru.json`, `messages/be.json`, under the existing `Site` namespace, add the three templated keys exactly as shown in the spec §7.1:

EN:
```jsonc
"Site": {
  "name": "Violetta Beauty",
  "description": "A private nail atelier — one chair, one hour, one quiet ritual at a time.",
  "tagline": "A private nail atelier",
  "og_title": "Violetta Beauty",
  "meta_title_with_city":       "Violetta — nails & beauty in {city}",
  "meta_description_with_city": "Editorial nail design in {city}. Manicure, gel, design — quality work at fair prices.",
  "meta_keywords_with_city":    "{city} nails, {city} manicure, {city} beauty, {city} gel, cheap quality nails {city}"
}
```

RU:
```jsonc
"meta_title_with_city":       "Violetta — маникюр и красота в {city}",
"meta_description_with_city": "Студия дизайна ногтей в {city}. Маникюр, гель, дизайн — качественно и доступно.",
"meta_keywords_with_city":    "маникюр {city}, ногти {city}, красота {city}, гель {city}, дешевый качественный маникюр {city}"
```

BE:
```jsonc
"meta_title_with_city":       "Violetta — манікюр і прыгажосць у {city}",
"meta_description_with_city": "Студыя дызайну пазногцяў у {city}. Манікюр, гель, дызайн — якасна і даступна.",
"meta_keywords_with_city":    "манікюр {city}, пазногці {city}, прыгажосць {city}, гель {city}, недарагі якасны манікюр {city}"
```

- [ ] **Step 2: Update `generateMetadata`**

Replace the existing `generateMetadata` body in `app/[locale]/layout.tsx`:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site" });
  const settings = await getSiteSettingsServer();
  const typedLocale = locale as Locale;
  const city = cityForLocale(settings, typedLocale);

  const baseName = t("name");
  const baseDescription = t("description");
  const title = city ? t("meta_title_with_city", { city }) : baseName;
  const description = city
    ? t("meta_description_with_city", { city })
    : baseDescription;
  const keywords = city ? t("meta_keywords_with_city", { city }) : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords,
    manifest: "/manifest.webmanifest",
    openGraph: {
      title,
      description,
      type: "website",
      siteName: baseName,
      locale: OG_LOCALE[locale] ?? OG_LOCALE.en,
      url: `${SITE_URL}/${locale}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE_URL}/${l}`]),
      ),
    },
  };
}
```

Add the imports at the top of the file:
```ts
import type { Locale } from "@/i18n/routing";
import { cityForLocale } from "@/entities/site-settings";
```

- [ ] **Step 3: Mount `<LocalBusinessJsonLd>` in the body**

In the `LocaleLayout` component, inside `<body>` and before `<NextIntlClientProvider>` — hoist the translator outside the JSX for readability:

```tsx
const tSite = await getTranslations({ locale, namespace: "Site" });
// …
return (
  <html /* … */>
    <body className="min-h-full flex flex-col">
      <LocalBusinessJsonLd
        settings={settings}
        locale={locale as Locale}
        siteUrl={SITE_URL}
        name={tSite("name")}
      />
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </body>
  </html>
);
```

(`settings` is already loaded near the top of `LocaleLayout`.)

Add the import:
```ts
import { LocalBusinessJsonLd } from "@/shared/ui/local-business-jsonld";
```

- [ ] **Step 4: Run lint + tests**

```bash
npm run lint && npm test
```
Expected: PASS. If a test in `app/[locale]/layout.test.tsx` or similar asserts on the old metadata shape, update it.

- [ ] **Step 5: Smoke-test the public surface**

Boot the dev server, set city in the admin (Task 12), then `curl -s http://localhost:3000/en | grep -E "(<title|<meta name=\"description|application/ld\\+json)"`. Confirm:
- Title contains the city
- Description contains the city
- A `<script type="application/ld+json">` block is emitted

- [ ] **Step 6: Commit**

```bash
git add 'app/[locale]/layout.tsx' messages/en.json messages/ru.json messages/be.json
git commit -m "feat(seo): city-templated metadata + LocalBusiness JSON-LD in locale layout"
```

---

## Task 17: E2E happy path

**Files:**
- Create: `e2e/admin-studio.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";

test("admin can configure the studio location and the home page reflects it", async ({ page }) => {
  await page.goto("/en/admin/studio");

  await page.getByLabel(/city.*english/i).fill("Borisov");
  await page.getByLabel(/city.*russian/i).fill("Борисов");
  await page.getByLabel(/city.*belarusian/i).fill("Барысаў");
  await page.getByLabel(/latitude/i).fill("54.231");
  await page.getByLabel(/longitude/i).fill("28.491");

  // Show-map checkbox only enables once coords are filled.
  const showMap = page.getByRole("checkbox", { name: /show map/i });
  await expect(showMap).toBeEnabled();
  await showMap.check();

  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(/saved/i)).toBeVisible();

  await page.goto("/en");
  await expect(page.getByRole("link", { name: /get directions/i })).toBeVisible();
  await expect(
    page.locator("iframe[src*='openstreetmap.org/export/embed.html']"),
  ).toBeVisible();
  // City appears in the address line.
  await expect(page.getByText(/Borisov/)).toBeVisible();
});
```

> **Note:** The Playwright config doesn't currently auth-gate. If `TELEGRAM_BOT_TOKEN` is unset in the e2e environment (the default for `npm run e2e`), the admin route is open. If your environment requires auth, this test must run with `TELEGRAM_BOT_TOKEN` unset (already the case for the existing `admin-*.spec.ts` files — copy their pattern).

- [ ] **Step 2: Run the e2e suite**

```bash
npm run e2e -- --grep "studio location"
```
Expected: the new test PASSES. The Playwright dev server boots on port 3100; ensure no `next dev` is currently running on that port.

If the test flaps on iframe loading, replace the `toBeVisible()` assertion on the iframe with `await expect(page.locator(...)).toHaveAttribute("loading", "lazy")` — the iframe exists in the DOM even before tiles load.

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-studio.spec.ts
git commit -m "test(e2e): admin studio config flows through to public home"
```

---

## Task 18: Final pass — lint, full test, build

- [ ] **Step 1: Full local CI**

```bash
npm run lint && npm test && npm run build
```
Expected: all three PASS. Note that `npm run build` is what the Husky pre-push hook runs — fixing here saves a force-push later.

- [ ] **Step 2: Spot-check the admin form in the browser**

`npm run dev`, then:
1. `/en/admin/studio` — form renders with seeded defaults.
2. Enter `54.231` / `28.491`, check the box, save → "Saved" appears.
3. `/en` — map iframe + "Get directions" link appear in the footer.
4. View source on `/en` — confirm:
   - `<title>` contains "Borisov" (the city you set; English form).
   - `<meta name="description">` contains "Borisov".
   - A `<script type="application/ld+json">` block is present with `"@type":"BeautySalon"`, `address.streetAddress`, and `geo` set.
5. Click "Get directions" — opens `https://www.google.com/maps/dir/?api=1&destination=54.231,28.491` in a new tab.

- [ ] **Step 3: PR**

Follow the project's `pr-description` skill. Branch is `feature/home-master-strip-photo-and-sets` per the open work, but if this work warrants its own branch (likely yes — it's a sizable feature), create `feature/admin-studio-location` from `main` first. PR title: `feat(admin): studio location, map, and city-driven SEO`.

---

## Out of scope (per spec §10)

- Multi-studio support.
- Opening hours in JSON-LD (already partially expressed via `availability_rules`).
- Admin-editable SEO copy.
- Interactive Leaflet map in admin or public footer.
- Geocoding from address → coords.
- Localized country names beyond English in the admin dropdown.
- Map on booking confirmation / other pages.
- Yandex / 2GIS / Apple Maps direct deep links beyond the universal Google Maps URL.
