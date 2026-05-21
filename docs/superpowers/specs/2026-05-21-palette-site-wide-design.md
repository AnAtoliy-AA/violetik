# Palette as a site-wide admin setting

**Date:** 2026-05-21
**Status:** Draft

## Goal

Make the visual palette a single site-wide setting controlled exclusively by the admin via `/admin/site-settings`. Replace the bare radio-button palette and locale pickers inside the existing site-settings form with the polished pill-style UI currently used by the standalone `PaletteSwitcher`. Remove the per-user palette cookie and the live switcher from the admin home, since admin's choice now applies to all visitors.

## Background

Today:

- `entities/site-settings` already models `defaultPalette` and `defaultLocale` on a singleton row in the DB. `updateSiteSettingsAction` validates a patch, persists, and calls `invalidateDefaultLocaleCache()` + `revalidatePath("/", "layout")`.
- `defaultLocale` already propagates to all users — `proxy.ts` resolves the default per request from `getCachedDefaultLocale()` (TTL 60s).
- `defaultPalette` is rendered server-side as `<html data-palette={settings.defaultPalette}>` in `app/[locale]/layout.tsx`, but an inline `PALETTE_INIT_SCRIPT` overrides it with a per-browser cookie (`vio-palette`) before paint. The cookie is written by the polished `PaletteSwitcher` (live, no save button), currently rendered only on `/admin`.
- The site-settings admin form (`features/site-settings-admin/ui/site-settings-form.tsx`) uses minimal `<input type="radio">` controls for palette and locale.

Result: admin can change the default, but any user who clicked the live switcher even once keeps their personal palette forever. Admin's change does not reach those users.

## Decisions

1. **Admin override wins** — palette is global. The per-user palette cookie goes away. Every visitor sees the admin's saved palette.
2. **Polished pill UI inside the form** — the palette and locale fieldsets inside `SiteSettingsForm` use the pill-style design from the screenshot (3-color swatch + uppercase name for palette; locale code + name for locale).
3. **Inline, not a shared slice** — the new pill markup lives inline in the form file. It is tightly coupled to form state, and the only other consumer (`features/palette-switcher`) is being deleted.
4. **Live picker on `/admin` is removed** — the canonical place to change palette is `/admin/site-settings`, alongside the other site settings.
5. **No client-side cookie path** — the inline `PALETTE_INIT_SCRIPT` in the locale layout is removed. The SSR-rendered `data-palette` attribute is authoritative.

## Out of scope

- Migrating existing user cookies. Once nothing reads `vio-palette`, the cookie is inert; it expires naturally at one year. No code or DB migration needed.
- Restyling other parts of the site-settings form (services, VIP, discount). Only the palette and locale fieldsets get the visual upgrade.
- Adding any user-facing palette preference. Palette is admin-only.

## Files touched

### Modify

- `features/site-settings-admin/ui/site-settings-form.tsx` — replace the palette fieldset's bare radios with a pill grid (1 col mobile, 2 cols sm, 3 cols md). Each pill is `<button type="button" role="radio" aria-checked>` showing the 3-color preview strip + uppercase palette name. Apply the same pill treatment to the locale fieldset (3 pills, no swatch — locale code + native name). Clicking a pill updates form state only; persistence happens on Save.
- `features/site-settings-admin/ui/site-settings-form.test.tsx` — assert the palette grid renders 12 pills, that one matches `initial.defaultPalette` with `aria-checked="true"`, that clicking another pill changes the checked state, and that submit forwards the chosen palette and locale.
- `app/[locale]/layout.tsx` — remove the `PALETTE_INIT_SCRIPT` constant, the `<script dangerouslySetInnerHTML>` in `<head>`, and the `PALETTE_COOKIE` import. `<html data-palette={settings.defaultPalette}>` stays.
- `app/[locale]/admin/page.tsx` — remove the `PaletteSwitcher` import and the `<section>` rendering it (plus the trailing `persistence_note` paragraph).
- `shared/config/palettes/index.ts` — drop the `writePaletteCookie` and `PALETTE_COOKIE` re-exports (delete the constant from the inner module too if no other consumer remains).
- `messages/{en,ru,be}.json` — remove the now-unused `Admin.persistence_note` key and the `PaletteSwitcher` namespace if no other consumer remains after the switcher is deleted.
- `app/globals.css` — remove the `.palette-sweep` keyframes/styles if present (used only by the deleted switcher's click effect).

### Delete

- `features/palette-switcher/` (entire slice: `ui/palette-switcher.tsx`, `ui/palette-switcher.test.tsx`, `index.ts`).
- `shared/config/palettes/cookie.client.ts`.

## Propagation guarantees

- **Locale** — unchanged from today. `updateSiteSettingsAction` calls `invalidateDefaultLocaleCache()` (immediate on the saving instance, ≤60s on other instances via TTL).
- **Palette** — `app/[locale]/layout.tsx` reads `getSiteSettingsServer()` on every render. `updateSiteSettingsAction` already calls `revalidatePath("/", "layout")`, which evicts the layout's cached output. With the inline init script and cookie gone, there is no client-side path that can override the SSR value.

No additional caching code is required.

## Risk & mitigation

- **Stale cookies on returning visitors** — harmless. Nothing reads `vio-palette` after this change. Cookie expires in ≤ 1 year. Documented in the "Out of scope" section.
- **Translations** — palette / locale labels are already in `messages/{en,ru,be}.json` under `Admin.site_settings_section_palette` and `Admin.site_settings_section_locale`. Removing `PaletteSwitcher.*` and `Admin.persistence_note` should be verified per-locale.
- **CSS palette overrides** — the 12 `[data-palette="<id>"]` blocks in `app/globals.css` remain unchanged. SSR sets the attribute; CSS does the rest.

## Verification

- `npm run lint` clean.
- `npm test` — new pill-grid assertions pass; deleted `palette-switcher.test.tsx` is gone; `site-settings-form.test.tsx` covers the new UI; no test references `PALETTE_COOKIE` or `writePaletteCookie`.
- `npm run build` succeeds.
- Manual: load `/admin/site-settings`, confirm the palette section matches the screenshot, change the palette, click Save, load `/` in a fresh incognito window and confirm the new palette is applied; clear cookies in the original window and confirm the same.
- Grep: zero references to `palette-switcher`, `PALETTE_COOKIE`, `writePaletteCookie`, `PaletteSwitcher`, `persistence_note` after the change.
