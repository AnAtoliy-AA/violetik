# Admin-editable studio location, map, and city-driven SEO

**Date:** 2026-05-23
**Status:** Approved (brainstorming)
**Owner:** TBD
**Touches:** `db/`, `entities/site-settings/`, `entities/studio/`, `features/studio-admin/` (new), `widgets/studio-map/` (new), `views/home/`, `app/[locale]/`, `shared/lib/google-calendar/`, `messages/*.json`

## 1. Goal

Make the studio's physical identity — street address, country, city/town, timezone, geo-coordinates, and an optional embedded map — editable by the admin instead of hardcoded in source. Drive locale-aware SEO (title, description, `<meta keywords>`, and `schema.org/LocalBusiness` JSON-LD) from the chosen city so the site ranks for `"<city> nails"`, `"<city> manicure"`, etc. in all three locales (en, ru, be). Surface the map plus a "Get directions" deep-link in the home footer when the admin enables it.

## 2. Background

The codebase already has a `site_settings` singleton row (Drizzle table at [db/schema.ts:219](../../../db/schema.ts#L219)) and an admin editor for it (the `features/site-settings-admin` slice). Today, three things are hardcoded that this spec moves under admin control:

1. `STUDIO_DATA.studio.address` in [entities/studio/model/data.ts:14](../../../entities/studio/model/data.ts#L14) — the single English string rendered by the home footer ([views/home/ui/sections/home-footer.tsx:18](../../../views/home/ui/sections/home-footer.tsx#L18)).
2. `DEFAULT_TIMEZONE = "Europe/Minsk"` in [shared/lib/google-calendar/working-hours.ts:15](../../../shared/lib/google-calendar/working-hours.ts#L15), used by the booking flow's slot rendering and the Google Calendar event-creation path.
3. The site-wide title/description in `Site.name` / `Site.description` ([messages/en.json:339](../../../messages/en.json#L339)) which are city-agnostic.

There is currently no map on the site and no structured-business data emitted for SEO.

## 3. Decisions (locked during brainstorming)

| Topic | Choice | Why |
| --- | --- | --- |
| Map provider | **OpenStreetMap iframe embed** | Free, no API key, no billing, no JS bundle, no Google ToS exposure. |
| Directions launcher | **Google Maps universal URL** `https://www.google.com/maps/dir/?api=1&destination=lat,lng` | Universal: Android opens the GMaps app, iOS shows the picker, desktop opens maps.google.com. |
| Coordinate input | **Manual lat/lng paste** in the admin form | Zero infra, zero cost, accurate. Admin gets a hint pointing at Google Maps' right-click-to-copy feature. |
| Country | **ISO-3166 alpha-2 dropdown** (~250 entries) | Closed finite list; clean for structured data + i18n. |
| City/town | **Free text per locale** (3 inputs) | Exhaustive city lists are infeasible; per-locale lets us render the city in each language ("Borisov" / "Борисов" / "Барысаў"). |
| Address | **Free text per locale** (3 inputs) | Mirrors the per-locale shape of city. |
| Timezone | **IANA dropdown** populated from `Intl.supportedValuesOf("timeZone")` | ~430 entries; native `<select>` handles it fine. |
| SEO copy | **Dev-maintained templates per locale with `{city}` placeholder** | Admin only sets the city; the dev team owns the per-language phrasing. |
| Structured data | **`schema.org/BeautySalon` LocalBusiness JSON-LD** in the locale layout | This is what actually gets the studio into Google Maps and "near me" searches. |
| Map placement | **Home footer only, above the address line** | Matches the screenshot the user provided; no expansion to other pages in this round. |
| Show/hide map | **Single boolean on the singleton row**, plus implicit requirement that `latitude`/`longitude` are non-null | Keeps state simple; UI disables the checkbox when coords are missing. |
| Admin route | **New `/admin/studio` page**, sibling to `/admin/site-settings` | Studio identity is a coherent group; bolting 9 fields onto the existing settings form would crowd it. |

## 4. Data model

### 4.1 Migration `0011_studio_location.sql`

```sql
ALTER TABLE site_settings
  ADD COLUMN address_en  text NOT NULL DEFAULT 'By appointment · Verbena Lane 14, Studio B',
  ADD COLUMN address_ru  text NOT NULL DEFAULT 'По записи · Verbena Lane 14, Studio B',
  ADD COLUMN address_be  text NOT NULL DEFAULT 'Па запісу · Verbena Lane 14, Studio B',
  ADD COLUMN country     text NOT NULL DEFAULT 'BY',
  ADD COLUMN city_en     text NOT NULL DEFAULT '',
  ADD COLUMN city_ru     text NOT NULL DEFAULT '',
  ADD COLUMN city_be     text NOT NULL DEFAULT '',
  ADD COLUMN timezone    text NOT NULL DEFAULT 'Europe/Minsk',
  ADD COLUMN latitude    double precision,
  ADD COLUMN longitude   double precision,
  ADD COLUMN map_visible boolean NOT NULL DEFAULT false;

ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_lat_range
    CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  ADD CONSTRAINT site_settings_lng_range
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
```

Defaults preserve today's behavior: footer text is unchanged after the migration runs; map stays hidden until the admin enables it.

### 4.2 Drizzle schema delta ([db/schema.ts](../../../db/schema.ts))

Add the columns above to the `siteSettings` `pgTable` definition, plus the two range checks. Update the inferred `SiteSettingsRow` type — no extra exports needed because consumers go through `entities/site-settings`.

### 4.3 Entity-layer types ([entities/site-settings/model/types.ts](../../../entities/site-settings/model/types.ts))

Extend `SiteSettings`:

```ts
export interface SiteSettings {
  // existing fields…
  addressEn: string;
  addressRu: string;
  addressBe: string;
  country: string;          // ISO-3166 alpha-2
  cityEn: string;
  cityRu: string;
  cityBe: string;
  timezone: string;         // IANA
  latitude: number | null;
  longitude: number | null;
  mapVisible: boolean;
}
```

`DEFAULT_SITE_SETTINGS` extended with the same defaults the migration uses.

### 4.4 Patch schema ([entities/site-settings/model/schema.ts](../../../entities/site-settings/model/schema.ts))

Extend `siteSettingsPatchSchema` (still `.partial()`):

- `addressEn` / `addressRu` / `addressBe`: `z.string().max(200)`
- `country`: `z.enum(ISO_3166_ALPHA2)` from a new constant
- `cityEn` / `cityRu` / `cityBe`: `z.string().max(120)`
- `timezone`: `z.string().refine((tz) => isValidTimeZone(tz))` — the validator wraps `Intl.supportedValuesOf("timeZone")`; if the runtime predates that API, fall back to constructing `new Intl.DateTimeFormat(undefined, { timeZone: tz })` and catching
- `latitude`: `z.number().min(-90).max(90).nullable()`
- `longitude`: `z.number().min(-180).max(180).nullable()`
- `mapVisible`: `z.boolean()`

Two cross-field invariants (refinements on the whole object):
- If `mapVisible === true`, both `latitude` and `longitude` must be non-null.
- If exactly one of `latitude`/`longitude` is non-null in the patch's resulting merged state, reject — coordinates come as a pair.

### 4.5 Shared config

Two new files in `shared/config/`:

- `countries.ts` — ISO-3166 alpha-2 list as `readonly [{ code: "AD", nameEn: "Andorra" }, …]`. ~250 entries. Names are sorted alphabetically by `nameEn` for the dropdown; localization (RU/BE country names) is out of scope for v1 — country names render in English in the admin UI only and aren't user-visible on the public site.
- `time-zones.ts` — exported `getTimeZoneList(): readonly string[]` that returns `Intl.supportedValuesOf("timeZone")` on first call (cached). A small allowlist override exists in case we ever need to prune.

## 5. Admin UI

### 5.1 New route [app/[locale]/admin/studio/page.tsx](../../../app/[locale]/admin/studio/page.tsx)

- Server component, mirrors [app/[locale]/admin/site-settings/page.tsx](../../../app/[locale]/admin/site-settings/page.tsx).
- Guards with the same admin-role check used by sibling admin pages.
- Reads current settings via `getSiteSettings()`, passes to `<StudioForm>` along with `countries`, `timeZones` props.
- Wraps in the standard admin chrome (plate, eyebrow, hero).

### 5.2 Admin home tile ([views/admin/](../../../views/admin/))

Add a "Studio" inbox tile next to the existing "Site settings" tile. Translation keys: `Admin.inbox_studio`, `Admin.inbox_studio_caption` ("Address, map, timezone").

### 5.3 New slice `features/studio-admin/`

```
features/studio-admin/
├── api/
│   └── update-studio.ts          server action; thin wrapper around updateSiteSettings()
├── ui/
│   ├── studio-form.tsx           client form
│   ├── studio-form.test.tsx      Vitest
│   └── studio-form.stories.tsx   Storybook (empty, populated, errors)
└── index.ts                      public API
```

### 5.4 `<StudioForm>` structure

A single `<form>` with one Save button, six fieldsets stacked vertically (mirroring the existing `SiteSettingsForm` typography and spacing):

1. **Address** — three text inputs (EN/RU/BE), 200 char counter.
2. **Country** — `<select>` populated from `shared/config/countries.ts`.
3. **City** — three text inputs (EN/RU/BE), 120 char counter.
4. **Coordinates** — two number inputs (`latitude`, `longitude`, step="any"). Helper line below: "Right-click your studio in Google Maps → click the coords to copy." A "Preview pin" `<a target="_blank">` opens `https://www.openstreetmap.org/?mlat=<lat>&mlon=<lng>#map=17/<lat>/<lng>` when both fields parse to numbers.
5. **Timezone** — `<select>` populated from `Intl.supportedValuesOf("timeZone")` (passed in as a prop so it's server-rendered once).
6. **Show map on home** — `<input type="checkbox">` bound to `mapVisible`. Disabled with a tooltip when latitude or longitude is empty: "Add coordinates first." Becomes enabled the moment both fields hold valid numbers.

State management mirrors `SiteSettingsForm`: per-field `useState`, `useTransition` for submit, three-status reducer (`idle | saved | error`).

### 5.5 Server action `update-studio.ts`

```ts
"use server";

export async function updateStudio(
  patch: SiteSettingsPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "unauthorized" };
  try {
    await updateSiteSettings(patch, session.user.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: messageFor(err) };
  }
}
```

`revalidatePath("/", "layout")` is what propagates the new address/map to every public page (the locale layout calls `getSiteSettingsServer()`).

## 6. Public surface

### 6.1 Home footer ([views/home/ui/sections/home-footer.tsx](../../../views/home/ui/sections/home-footer.tsx))

Refactor:

- Replace `STUDIO_DATA.studio.address` with the per-locale address+city read from site settings. The home footer becomes async (server component) and calls `getSiteSettingsServer()` directly (or accepts settings as a prop if the home view already has them in scope — preferred, fewer DB hits).
- Insert `<StudioMap />` between the monogram and the address line, no-op when the widget decides not to render.
- Address line composition: `"{addressXx} · {cityXx}"` when city is non-empty, else just `{addressXx}`. Per locale.

### 6.2 New widget slice `widgets/studio-map/`

```
widgets/studio-map/
├── ui/
│   ├── studio-map.tsx            server component, no client JS
│   ├── studio-map.test.tsx
│   └── studio-map.stories.tsx
└── index.ts
```

`<StudioMap>` props: `{ settings: SiteSettings, locale: Locale }`. Renders nothing when `!settings.mapVisible || settings.latitude == null || settings.longitude == null`. Otherwise:

```tsx
<section aria-label={t("map_aria")} className="…">
  <iframe
    src={`https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${lat},${lng}`}
    title={t("map_title")}
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    className="aspect-[16/9] w-full max-w-[420px] rounded border-[0.5px] border-line"
  />
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
    target="_blank"
    rel="noopener"
    className={buttonClassName({ variant: "ghost", size: "sm" })}
  >
    {t("get_directions")}
  </a>
</section>
```

`minLng`/`maxLng`/`minLat`/`maxLat` are `lng ± 0.005`, `lat ± 0.005` (~500m square at typical latitudes). No client JS; the iframe handles interactivity.

### 6.3 Strip the hardcoded address

Remove the `address` field from [entities/studio/model/data.ts](../../../entities/studio/model/data.ts) and the `StudioInfo` type. Any test that asserts on the old string updates to read from settings (or gets deleted if the assertion is no longer meaningful).

### 6.4 Booking timezone

[shared/lib/google-calendar/working-hours.ts](../../../shared/lib/google-calendar/working-hours.ts) currently exposes `bookingTimeZone()` reading `process.env.NEXT_PUBLIC_BOOKING_TIMEZONE` with a `Europe/Minsk` fallback. Replace it with two functions:

- `bookingTimeZoneFromSettings(settings: SiteSettings): string` — pure, returns `settings.timezone`.
- `bookingTimeZoneFallback(): string` — keeps the env-var + `Europe/Minsk` fallback, used when no settings object is in scope (build-time SSG, unit tests).

Audit and update call sites:
- [views/booking/api/submit.ts](../../../views/booking/api/submit.ts) — server action; has DB access, switches to `bookingTimeZoneFromSettings()`.
- [views/booking/lib/booking-steps.ts](../../../views/booking/lib/booking-steps.ts) — currently uses `"UTC"`; out of scope (cosmetic strings only, no behavior change).
- Anywhere else `bookingTimeZone()` is called inside a server context where settings are already loaded (locale layout) — pass through.
- Google Calendar event creation ([shared/lib/google-calendar/events.ts](../../../shared/lib/google-calendar/events.ts)) — caller already supplies `timeZone`; the caller updates to source it from settings.

Leave the env var working as a safety net.

## 7. SEO

### 7.1 New i18n keys

Three new keys per locale under the existing `Site` namespace:

```jsonc
// messages/en.json (and analogous for ru/be)
"Site": {
  "name": "Violetta Beauty",
  "description": "…",
  "tagline": "…",
  "og_title": "…",
  "meta_title_with_city":       "Violetta — nails & beauty in {city}",
  "meta_description_with_city": "Editorial nail design in {city}. Manicure, gel, design — quality work at fair prices.",
  "meta_keywords_with_city":    "{city} nails, {city} manicure, {city} beauty, {city} gel, cheap quality nails {city}"
}
```

RU and BE variants follow the patterns shown in §4 of the brainstorming transcript.

### 7.2 `generateMetadata` ([app/[locale]/layout.tsx](../../../app/[locale]/layout.tsx))

Switch to the templated keys when `cityXx` is non-empty:

```ts
const settings = await getSiteSettingsServer();
const city = cityForLocale(settings, locale);  // pick cityEn/cityRu/cityBe
const title = city
  ? t("meta_title_with_city", { city })
  : t("name");
const description = city
  ? t("meta_description_with_city", { city })
  : t("description");
const keywords = city
  ? t("meta_keywords_with_city", { city })
  : undefined;

return {
  // …existing fields…
  title,
  description,
  keywords,            // omitted when undefined
  openGraph: { title, description, /* … */ },
};
```

`cityForLocale` is a small pure helper colocated in `entities/site-settings/model/`.

### 7.3 LocalBusiness JSON-LD

New component [shared/ui/local-business-jsonld.tsx](../../../shared/ui/local-business-jsonld.tsx):

```tsx
export function LocalBusinessJsonLd({
  settings,
  locale,
  siteUrl,
  name,
}: Props) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name,
    url: `${siteUrl}/${locale}`,
  };
  const hasAddress =
    settings.country && (settings.addressEn || addressForLocale(settings, locale));
  if (hasAddress) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: addressForLocale(settings, locale),
      addressLocality: cityForLocale(settings, locale) || undefined,
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

Mounted in [app/[locale]/layout.tsx](../../../app/[locale]/layout.tsx) inside `<body>`, before `<NextIntlClientProvider>`. Omits the `address` / `geo` blocks cleanly when their data is empty so we never emit half-filled structured data.

### 7.4 No sitemap changes

[app/sitemap.ts](../../../app/sitemap.ts) already enumerates every locale × public route. City changes don't add routes.

## 8. Testing

| Layer | File | What it covers |
| --- | --- | --- |
| DB | [db/site-settings.test.ts](../../../db/site-settings.test.ts) (extend) | Round-trip the new columns; defaults; lat/lng range constraints; mapVisible↔coords invariant. |
| Entity | [entities/site-settings/model/schema.test.ts](../../../entities/site-settings/model/schema.test.ts) (extend) | Zod accepts valid lat/lng/country/timezone; rejects invalid; rejects `mapVisible: true` with null coords; rejects half-pair coords. |
| Entity | `entities/site-settings/model/city-for-locale.test.ts` (new) | `cityForLocale` / `addressForLocale` pick correct field; fall back to EN when target locale empty. |
| Feature | `features/studio-admin/ui/studio-form.test.tsx` (new) | Renders, submits patch with right shape; shows error; "Show map" disabled when coords blank. |
| Widget | `widgets/studio-map/ui/studio-map.test.tsx` (new) | Renders iframe + directions link with correct URLs when enabled; renders nothing when hidden / coords missing. |
| Shared | `shared/ui/local-business-jsonld.test.tsx` (new) | Emits parseable JSON-LD; omits address/geo when empty; includes them when populated. |
| View | `views/home/ui/sections/home-footer.test.tsx` (extend or new) | Address comes from settings; map widget mounted only when admin enabled it. |
| Storybook | `*.stories.tsx` for `StudioForm` and `StudioMap` | Per `new-ui-component` skill: empty, populated, errors, map hidden / shown / no-coords. |
| E2E | [e2e/admin-studio.spec.ts](../../../e2e/admin-studio.spec.ts) (new) | Admin signs in, fills the form, saves, visits `/`, sees the iframe and the directions link. |

`npm run lint`, `npm test`, `npm run build` must all pass before merge (Husky pre-commit and pre-push enforce). Playwright `npm run e2e` for the e2e additions.

## 9. Migration & rollout

1. Land the Drizzle schema + migration; `npm run db:push` in CI / preview.
2. Land the entity/schema/types extensions.
3. Land the admin route, form, and feature slice (gated behind admin role; no public surface yet).
4. Land the widget + footer refactor + `STUDIO_DATA.address` removal in the same PR (atomic — the footer must not reference the deleted field).
5. Land the SEO templates + JSON-LD component.
6. Land the booking-timezone refactor.
7. After deploy, admin opens `/admin/studio`, fills coords + city, ticks "Show map" → footer renders the map and SEO immediately picks up the templated copy on the next page request (revalidated by the server action).

The migration is non-destructive (column additions with safe defaults); no backfill script is needed.

## 10. Out of scope

- Multi-studio support (the singleton remains).
- Phone number / opening-hours in JSON-LD (opening hours are already partially expressed via `availability_rules`; structured-data wiring of them is a follow-up).
- Admin-editable SEO copy (templates remain dev-controlled).
- Interactive Leaflet map in the admin or public footer.
- Geocoding from address → coords.
- Localized country names beyond English in the admin dropdown.
- Other-pages map embed (booking confirmation, etc.) — explicit deferred per §4 decisions table.
- Yandex Maps / 2GIS / Apple Maps direct deep links beyond the universal Google Maps URL.

## 11. Risks

- **Map iframe blocked by strict ad-blockers / DNS filters.** Mitigation: the iframe degrades to a blank box; the "Get directions" link still works.
- **OSM tile reliability.** Mitigation: OSM has been stable for years; if it ever degrades, swapping the iframe `src` to a Google Maps share URL is a one-line change.
- **Timezone changes during active bookings.** If the admin changes the timezone while bookings exist, displayed slot times shift. Mitigation: confirm dialog in the admin form ("Changing timezone affects how upcoming booking times are shown to guests. Continue?") — flagged as a v1.1 polish if time allows; the v1 behaviour is "admin owns this change."
- **Empty city + `mapVisible: true`.** Allowed by the schema (city is for SEO copy, not map). Map still shows because coords drive the iframe.
- **Half-pair lat/lng.** Rejected at the Zod boundary so the DB never sees an inconsistent pair.

## 12. Open questions

None at design close. All forks resolved during brainstorming (see Decisions table in §3).
