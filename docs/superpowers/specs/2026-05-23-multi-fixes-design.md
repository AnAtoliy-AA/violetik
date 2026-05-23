# Multi-fixes (welcome flame, master photo, footer credit, palette preview, locale switcher, `be` → `by`)

**Date:** 2026-05-23
**Branch:** `feature/multi-fixes` (from `develop`)

A grouped set of small product polish items plus one larger locale-code rename. Each task is independent and lands as its own commit so the heavy rename stays isolated.

## Goals

1. Welcome screen visual unity — use the same flame-V monogram as the home hero, not the nail fan.
2. Master profile photo is currently too dominant — reduce visual weight.
3. Add an Arcadeum Games Studio credit line that appears on every locale-prefixed page.
4. Admin palette change is invisible until save → give it a live in-page preview that reverts if not saved.
5. Locale switcher exists in code but is mounted nowhere — wire it into the AppHeader and the Welcome screen.
6. Belarusian locale identifier changes from ISO-639-1 `be` to country-code `by` per user preference, with a redirect so old `/be/*` URLs survive.
7. Confirm (with a regression test) that the admin-chosen default locale is the fallback for visitors whose browser language isn't EN/RU/BY. Behavior already exists; lock it in.

## Non-goals

- No general refactor of unrelated areas.
- No change to next-themes light/dark; "theme" in the user's request means palette.
- No new admin field for theme (light/dark) is added.
- No data backfill for testimonials/services beyond what the `be → by` rename requires.

## Task inventory

### T1 — Welcome flame
**File:** [views/welcome/ui/welcome-page.tsx](../../../views/welcome/ui/welcome-page.tsx)
Replace the `<NailFan />` block (lines 66-76) with `<FlameMonogram letter="V">` (already used at [views/home/ui/sections/home-hero.tsx](../../../views/home/ui/sections/home-hero.tsx)). Keep the existing motion wrapper; tune the container to match the FlameMonogram's intrinsic sizing.

`NailFan` import is removed. No story/test changes for FlameMonogram (already covered).

### T2 — Master profile photo size
**File:** [views/master/ui/master-page.tsx](../../../views/master/ui/master-page.tsx)
Change `aspect-[1/1.2]` → `aspect-[1/1]` and wrap the photo container in `max-w-[320px] mx-auto`. Roughly 35% smaller area, centred. Existing gilded frame + Eyebrow + h1 overlay stay intact. Update master-page.test if it asserts on the wrapper class.

### T3 — Global site footer with Arcadeum credit
**New widget:** `widgets/site-footer/`
- `ui/site-footer.tsx` — renders translated prefix + a link to `https://arcadeum.games` labelled `Arcadeum Games Studio` (brand name stays English in every locale).
- `ui/site-footer.stories.tsx`, `ui/site-footer.test.tsx`, `index.ts`.
- Tiny: one centred line, `font-mono text-[9px] uppercase tracking-[0.32em] text-text-3`, `target="_blank" rel="noopener"` on the link.

**Translations:** add `SiteFooter.credit_prefix` to [messages/en.json](../../../messages/en.json), [messages/ru.json](../../../messages/ru.json), and [messages/by.json](../../../messages/by.json) (post-rename).
- en: `"Created with Love by"`
- ru: `"Создано с любовью"`
- by: `"Створана з любоўю"`

**Mount:** [app/[locale]/layout.tsx](../../../app/[locale]/layout.tsx) — render `<SiteFooter />` after `{children}` inside `<body>`. Welcome page is `min-h-dvh`, not `h-dvh`, so the footer naturally sits below it without clipping.

### T4 — Locale switcher wired into the app
**Refactor:** [features/locale-switcher/ui/locale-switcher.tsx](../../../features/locale-switcher/ui/locale-switcher.tsx)
Replace the plain `<select>` with a compact pill-style segmented control that matches AppHeader's pill aesthetic (`rounded-full border-[0.5px]`, `font-mono text-[11px] uppercase tracking-[0.16em]`). Single-character labels (`EN`, `RU`, `BY`).

Accept an optional `variant: "header" | "welcome"` prop for size differences (welcome variant is smaller and lower-contrast so it doesn't compete with the hero).

**Mount sites:**
- [widgets/app-header/ui/app-header.tsx](../../../widgets/app-header/ui/app-header.tsx) — place LocaleSwitcher between the left slot (wordmark/back) and the menu button. Update the header story + test.
- [views/welcome/ui/welcome-page.tsx](../../../views/welcome/ui/welcome-page.tsx) — top-right corner of the screen, motion-fade in with the rest of the chrome.

Story coverage: a new story per variant.

### T5 — Admin palette live preview
**File:** [features/site-settings-admin/ui/site-settings-form.tsx](../../../features/site-settings-admin/ui/site-settings-form.tsx)
Add a `useEffect` that mutates `document.documentElement.dataset.palette` whenever the local `defaultPalette` state changes. Cleanup function (form unmount or component teardown) restores the value the page first loaded with (`initial.defaultPalette`) — so navigating away from the admin page without saving reverts the preview.

On successful save, update the baseline so the cleanup no longer reverts to the old value.

Approach detail:
```
const baselineRef = useRef(initial.defaultPalette);

useEffect(() => {
  document.documentElement.dataset.palette = defaultPalette;
  return () => {
    document.documentElement.dataset.palette = baselineRef.current;
  };
}, [defaultPalette]);

// in submit handler, on success:
baselineRef.current = defaultPalette;
```

The cleanup runs on every defaultPalette change (because it's in the deps) — that's fine because the next effect immediately reapplies. The unmount cleanup uses the latest ref value.

Add a Vitest test that asserts `document.documentElement.dataset.palette` flips when a different palette is clicked.

### T6 — Default-locale regression test
**File:** new unit test against [proxy.ts](../../../proxy.ts) flow OR more pragmatically against [shared/lib/site-settings-cache.ts](../../../shared/lib/site-settings-cache.ts).
Document with a comment in `proxy.ts` that admin's chosen default is the fallback used by `next-intl` when the browser's Accept-Language doesn't match any supported locale. Add a unit test that swapping the cached settings's `defaultLocale` to `"en"` makes the proxy pass `defaultLocale: "en"` into `createMiddleware`. No behavior change.

### T7 — `be` → `by` locale rename

This is the heaviest item. Land as its own commit.

**Routing / i18n:**
- [i18n/routing.ts](../../../i18n/routing.ts): `locales: ["en", "ru", "be"]` → `["en", "ru", "by"]`.
- Rename file [messages/be.json](../../../messages/be.json) → `messages/by.json`. In its `LocaleSwitcher` namespace, rename the `"be"` key to `"by"` and update labels. Same key rename in en/ru.
- The `OG_LOCALE` map in `app/[locale]/layout.tsx` becomes `{ ..., by: "be_BY" }` (the Open Graph value stays `be_BY` — that's the OG locale spec, separate from our internal locale identifier).

**Code-side replacements** (mechanical search-and-replace, scoped to locale identifier usage; not blind):
- All `locale === "be"` → `locale === "by"` across views, features, entities, e2e specs (~15 sites grep'd above).
- Field accessor `c.nameBe` → `c.nameBy`, `row.masterNameBe` → `row.masterNameBy`, `b.nameBe` → `b.nameBy`, etc. — only where these are the field names defined in `db/schema.ts`, not where `Be` is part of an unrelated identifier.
- The ad-hoc `type Locale = "en" | "ru" | "be"` in [entities/master/api/load.ts](../../../entities/master/api/load.ts) is removed in favor of the canonical import from `@/i18n/routing`. (Quick incidental cleanup since we're touching the line anyway.)
- The Belarusian-label translation string (e.g. en.json `"be": "Belarusian"` under `LocaleSwitcher`) becomes `"by": "Belarusian"`.

**Schema rename:** [db/schema.ts](../../../db/schema.ts)
Columns ending in `_be` (the Drizzle Postgres `text("name_be")` etc.) are renamed to `_by`. Drizzle field names in TS likewise (`nameBe` → `nameBy`).

**Data migration:** new `db/migrations/0XXX_rename_be_to_by.sql` (number chosen at write-time based on highest existing). For every table that has `*_be` columns or stores JSON with a `"be"` key, do:
- `ALTER TABLE … RENAME COLUMN name_be TO name_by;` (×N).
- `UPDATE … SET includes = (includes::jsonb - 'be') || jsonb_build_object('by', includes->'be') WHERE includes ? 'be';` for JSON columns that store multi-locale dictionaries.
- `UPDATE site_settings SET default_locale = 'by' WHERE default_locale = 'be';`

The full list of columns/tables is discovered from `db/schema.ts` at write time, listed in the migration's leading comment.

**Compat redirect:** [proxy.ts](../../../proxy.ts) gains a 308 redirect for any URL starting with `/be/` or matching `/be` exactly — issued before next-intl middleware runs, returning a `Response.redirect` to the same path with `be` replaced by `by`. Keeps old bookmarks alive.

**Tests/stories:** e2e specs in [e2e/](../../../e2e/) that iterate `["en", "ru", "be"]` → `["en", "ru", "by"]`. View tests that mount the `be` locale (e.g. [views/home/ui/sections/atelier-motion.test.tsx](../../../views/home/ui/sections/atelier-motion.test.tsx)) likewise. Stories using `locale: "be"` (e.g. [shared/ui/price/ui/price.stories.tsx](../../../shared/ui/price/ui/price.stories.tsx)) likewise.

**Acceptance:** `npm run lint && npm test && npm run build && npm run e2e` all pass. Visiting `/be/home` issues a redirect to `/by/home`.

## Order of work and commit boundaries

| # | Commit | Tasks |
|---|---|---|
| 1 | `chore: branch from develop` (implicit) | branch creation |
| 2 | `feat(welcome): use flame-V monogram instead of nail fan` | T1 |
| 3 | `refactor(master): tighten profile photo size + center` | T2 |
| 4 | `feat(footer): add global site footer with Arcadeum credit` | T3 |
| 5 | `feat(locale-switcher): pill UI + mount in header and welcome` | T4 |
| 6 | `feat(admin): live palette preview before save` | T5 |
| 7 | `test(proxy): pin admin default-locale fallback behavior` | T6 |
| 8 | `refactor(i18n): rename Belarusian locale be → by` | T7 |

Each commit passes lint + Vitest (husky pre-commit). The final push runs the build (husky pre-push). E2E is run locally before opening the PR; full pass required before merge.

## Risks

- **`be → by` rename ripple.** Many touchpoints — code, JSON, migrations, e2e. Mitigation: isolated commit; redirect for back-compat; full lint+test+e2e sweep before push.
- **SiteFooter on Welcome.** Welcome's hero is intentionally framed inside the viewport. Adding a small footer line below could push the CTAs further down on shorter screens. Mitigation: footer is a single short line at `text-[9px]`; visual review during T3.
- **AppHeader admin route polish.** The header is used in admin too. Adding a locale switcher there is desired (admin can switch UI language for testing) — confirm it doesn't crowd the small admin header. Mitigation: pill control is intentionally compact; verify in admin route screenshots.
- **Palette preview leak.** If the cleanup doesn't run (e.g. hard-refresh while editing), the user-applied palette persists in the DOM but the DB hasn't changed → next render snaps back. Acceptable.

## Out of scope (deferred)

- Light/dark `next-themes` integration with admin settings.
- A separate locale switcher for admin-only language (right now we use the same UI locale).
- Sitemap regeneration in response to the locale rename (sitemap reads from `routing.locales` so it auto-updates; no action needed).
