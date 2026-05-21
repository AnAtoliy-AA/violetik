# Palette as a site-wide admin setting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make palette a global admin-controlled setting. Replace the bare radio palette/locale pickers inside `/admin/site-settings` with the polished pill UI from the screenshot; delete the per-user palette cookie, the standalone `PaletteSwitcher` slice, and the inline init script in the locale layout.

**Architecture:** No new abstractions. The pill UI lives inline inside `features/site-settings-admin/ui/site-settings-form.tsx` (it is tightly coupled to form state). The admin home loses its palette section. The locale layout's SSR-rendered `<html data-palette={settings.defaultPalette}>` becomes the only source of truth — no cookie, no client overrides. `defaultLocale` propagation is already handled by the existing TTL cache + `revalidatePath` in `updateSiteSettingsAction`; no caching changes are required.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · TypeScript · Vitest + Testing Library · next-intl · Drizzle (already wired) · Storybook.

**Spec:** [docs/superpowers/specs/2026-05-21-palette-site-wide-design.md](../specs/2026-05-21-palette-site-wide-design.md)

**Branch hygiene:** The current branch (`feature/admin-photo-upload`) is unrelated. Before starting, create a fresh worktree per `superpowers:using-git-worktrees` (e.g. `.claude/worktrees/palette-site-wide`) branched from `main` so this work lands in its own PR.

---

## File Structure

### Modify
- `features/site-settings-admin/ui/site-settings-form.tsx` — replace palette + locale fieldsets with pill grid.
- `features/site-settings-admin/ui/site-settings-form.test.tsx` — assert pill UI, swatch, click changes selection, submit forwards values.
- `features/site-settings-admin/ui/site-settings-form.stories.tsx` — visual smoke only; no logical change.
- `app/[locale]/admin/page.tsx` — drop `PaletteSwitcher` import + its `<section>` + hero copy that's now stale.
- `app/[locale]/layout.tsx` — remove `PALETTE_INIT_SCRIPT` constant, `<script>` in `<head>`, `PALETTE_COOKIE` import.
- `shared/config/palettes/index.ts` — drop `writePaletteCookie` and `PALETTE_COOKIE` re-exports.
- `shared/config/palettes/palettes.ts` — drop `PALETTE_COOKIE` constant.
- `messages/en.json`, `messages/ru.json`, `messages/be.json` — remove `PaletteSwitcher` namespace, `Admin.persistence_note`, update `Admin.hero_title` + `Admin.hero_paragraph`.
- `app/globals.css` — remove `.palette-sweep` block (~621-635) and `@keyframes paletteSweep` (~417-429).

### Delete
- `features/palette-switcher/ui/palette-switcher.tsx`
- `features/palette-switcher/ui/palette-switcher.test.tsx`
- `features/palette-switcher/index.ts`
- `features/palette-switcher/` (entire dir empty after the above — remove)
- `shared/config/palettes/cookie.client.ts`

---

## Task 1: Update the form tests to expect the pill UI (RED)

**Files:**
- Modify: `features/site-settings-admin/ui/site-settings-form.test.tsx`

Use @superpowers:test-driven-development.

- [ ] **Step 1: Replace the "renders a radio per palette and per locale" assertion with a richer set that documents the new pill UI.** The pills are still `role="radio"` so the existing palette assertion holds; add three new things:

```tsx
  it("renders a pill per palette with a 3-swatch preview", () => {
    renderForm();
    const pills = screen.getAllByRole("radio", { name: /Aubergine|Rose|Lilac|Mono|Ink|Moss|Bronze|Pearl|Emerald|Sapphire|Ruby|Obsidian/ });
    expect(pills).toHaveLength(12);
    // The initial defaultPalette is `aubergine` per DEFAULT_SITE_SETTINGS.
    const aubergine = screen.getByRole("radio", { name: /Aubergine/i });
    expect(aubergine).toHaveAttribute("aria-checked", "true");
    // Each pill contains a 3-color swatch row (one <span> per color, aria-hidden).
    const swatch = aubergine.querySelector('[aria-hidden="true"]');
    expect(swatch).not.toBeNull();
    expect(swatch!.children).toHaveLength(3);
  });

  it("changes the checked palette when a different pill is clicked", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("radio", { name: /Ink/i }));
    expect(screen.getByRole("radio", { name: /Ink/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Aubergine/i })).toHaveAttribute("aria-checked", "false");
  });

  it("submits the chosen palette and locale in the patch", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.click(screen.getByRole("radio", { name: /Moss/i }));
    await user.click(screen.getByRole("radio", { name: /^RU$/i }));
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const patch = onSubmit.mock.calls[0][0];
    expect(patch.defaultPalette).toBe("moss");
    expect(patch.defaultLocale).toBe("ru");
  });
```

Replace the existing `"renders a radio per palette and per locale"` test with these three. Keep the other tests (overrides, discount clamp, omit-empty-overrides) unchanged.

- [ ] **Step 2: Run the test file and confirm the new tests fail for the right reason.**

Run: `npx vitest run features/site-settings-admin/ui/site-settings-form.test.tsx`
Expected: the three new tests FAIL — the swatch query returns `null` (no `aria-hidden` swatch on bare radios), the click changes the input but not an `aria-checked` attribute, etc. Existing tests still pass.

- [ ] **Step 3: Do NOT commit yet — implementation follows in Task 2.**

---

## Task 2: Implement the pill UI inside the form (GREEN)

**Files:**
- Modify: `features/site-settings-admin/ui/site-settings-form.tsx`

- [ ] **Step 1: Replace the palette `<fieldset>` (currently lines ~101-119) with the pill grid.** Use the existing `PALETTES` import and `cn` from `@/shared/lib/cn`. The shape mirrors `features/palette-switcher/ui/palette-switcher.tsx`, minus the live-cookie click handler:

```tsx
import { PALETTES, type PaletteId } from "@/shared/config/palettes";
import { cn } from "@/shared/lib/cn";

// ...inside the form, replace the palette fieldset:
<fieldset aria-label={t("site_settings_section_palette")}>
  <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
    {t("site_settings_section_palette")}
  </legend>
  <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
    {PALETTES.map((p) => {
      const selected = defaultPalette === p.id;
      return (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => setDefaultPalette(p.id as PaletteId)}
          className={cn(
            "group flex items-center gap-3 rounded-full border-[0.5px] px-3 py-2",
            "transition-colors duration-fast ease-out",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            selected
              ? "border-accent bg-surface-2 text-text"
              : "border-line text-text-2 hover:border-line-strong hover:text-text",
          )}
        >
          <span
            aria-hidden="true"
            className="flex shrink-0 overflow-hidden rounded-full border-[0.5px] border-line-strong"
          >
            {p.preview.map((color, i) => (
              <span key={i} className="block size-4" style={{ background: color }} />
            ))}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
            {p.name}
          </span>
        </button>
      );
    })}
  </div>
</fieldset>
```

- [ ] **Step 2: Replace the locale `<fieldset>` (currently lines ~121-139) with the matching pill design.** Locale pills have no swatch — just the uppercase locale code:

```tsx
<fieldset aria-label={t("site_settings_section_locale")}>
  <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
    {t("site_settings_section_locale")}
  </legend>
  <div role="radiogroup" className="grid grid-cols-3 gap-2">
    {routing.locales.map((l) => {
      const selected = defaultLocale === l;
      return (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={l.toUpperCase()}
          onClick={() => setDefaultLocale(l)}
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
            {l}
          </span>
        </button>
      );
    })}
  </div>
</fieldset>
```

Note the `aria-label={l.toUpperCase()}` — the test queries `{ name: /^EN$/i }`, which matches the accessible name; the visible text is lowercase `en`/`ru`/`be` shown uppercase by Tailwind.

- [ ] **Step 3: Run the form test and confirm the new tests pass.**

Run: `npx vitest run features/site-settings-admin/ui/site-settings-form.test.tsx`
Expected: all tests PASS (the original four + the three new ones).

- [ ] **Step 4: Storybook smoke-check (optional but recommended).**

Run: `npm run storybook` and open `/?path=/story/features-site-settings-admin-sitesettingsform--default`. Visually confirm the palette pills render in a 1/2/3-column responsive grid with 3-swatch previews, the locale pills render in a 3-column row, the "aubergine" / "en" pills are selected. Close Storybook.

- [ ] **Step 5: Commit.**

Use @commit.

```bash
git add features/site-settings-admin/ui/site-settings-form.tsx \
        features/site-settings-admin/ui/site-settings-form.test.tsx
git commit -m "feat(site-settings): polished pill UI for palette and locale pickers"
```

The Husky pre-commit hook runs `lint` + `test` — make sure both pass.

---

## Task 3: Remove the live PaletteSwitcher from the admin home

**Files:**
- Modify: `app/[locale]/admin/page.tsx`

- [ ] **Step 1: Delete the palette `<section>` (lines ~125-130) and the `PaletteSwitcher` import (line 7).** After the change, the admin home renders the hero, the inbox grid, and (when auth is required) the sign-out section. No palette UI.

```tsx
// Delete these:
import { PaletteSwitcher } from "@/features/palette-switcher";

// And the entire section:
<section className="px-[22px] pt-2 pb-10">
  <PaletteSwitcher />
  <p className="mt-6 max-w-[420px] font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
    {t("persistence_note")}
  </p>
</section>
```

- [ ] **Step 2: Update the stale hero copy.** The hero currently reads `t("hero_title")` = "Palette." and `t("hero_paragraph")` = "Pick the studio colourway. The selection persists in a cookie and applies for everyone visiting from this device." Both describe the now-deleted palette feature. The hero already exists — keep it pointed at the inbox/admin purpose instead. Edit values in `messages/en.json`, `messages/ru.json`, `messages/be.json`:

```json
// messages/en.json (Admin)
"hero_title": "Studio admin.",
"hero_paragraph": "Manage bookings, VIP requests, photography, and site-wide defaults from one place.",

// messages/ru.json (Admin)
"hero_title": "Админ ателье.",
"hero_paragraph": "Записи, VIP-заявки, галерея и настройки сайта — в одном месте.",

// messages/be.json (Admin)
"hero_title": "Адмін атэлье.",
"hero_paragraph": "Запісы, VIP-заяўкі, галерэя і налады сайта — у адным месцы.",
```

Translations are best-effort; the user can refine RU/BE later. The English string is the canonical fallback.

- [ ] **Step 3: Run the test suite to confirm nothing breaks.**

Run: `npm test`
Expected: all tests PASS. (No tests reference `PaletteSwitcher` from the admin home; the admin page is not unit-tested.)

- [ ] **Step 4: Commit.**

```bash
git add app/[locale]/admin/page.tsx messages/en.json messages/ru.json messages/be.json
git commit -m "refactor(admin): drop palette switcher from admin home"
```

---

## Task 4: Delete the standalone PaletteSwitcher slice

**Files:**
- Delete: `features/palette-switcher/ui/palette-switcher.tsx`
- Delete: `features/palette-switcher/ui/palette-switcher.test.tsx`
- Delete: `features/palette-switcher/index.ts`
- Delete: `features/palette-switcher/` (the empty dir)

- [ ] **Step 1: Verify no remaining consumers before deletion.**

Run: `grep -rn 'features/palette-switcher\|from "@/features/palette-switcher"\|PaletteSwitcher' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v .next | grep -v worktrees | grep -v 'features/palette-switcher/'`
Expected: zero matches (the import from `app/[locale]/admin/page.tsx` was removed in Task 3).

- [ ] **Step 2: Delete the files.**

```bash
rm -rf features/palette-switcher
```

- [ ] **Step 3: Verify build + test still pass.**

Run: `npm test`
Expected: all tests PASS (one fewer test file — the deleted `palette-switcher.test.tsx`).

- [ ] **Step 4: Commit.**

```bash
git add features/palette-switcher
git commit -m "chore: remove standalone palette-switcher slice (consumers removed)"
```

`git add` on a deleted directory stages the deletions. The `commit` skill runs lint+test via the pre-commit hook.

---

## Task 5: Delete cookie machinery + inline init script

**Files:**
- Delete: `shared/config/palettes/cookie.client.ts`
- Modify: `shared/config/palettes/index.ts`
- Modify: `shared/config/palettes/palettes.ts`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Delete `shared/config/palettes/cookie.client.ts`.**

```bash
rm shared/config/palettes/cookie.client.ts
```

- [ ] **Step 2: Update `shared/config/palettes/index.ts`** — drop the `writePaletteCookie` re-export and the `PALETTE_COOKIE` re-export:

```ts
// New contents:
export {
  PALETTES,
  DEFAULT_PALETTE_ID,
  isPaletteId,
  paletteById,
} from "./palettes";
export type { Palette, PaletteId } from "./palettes";
```

- [ ] **Step 3: Update `shared/config/palettes/palettes.ts`** — remove the `PALETTE_COOKIE` constant (currently `export const PALETTE_COOKIE = "vio-palette";` near the bottom).

- [ ] **Step 4: Update `app/[locale]/layout.tsx`** — remove the `PALETTE_COOKIE` import, the `PALETTE_INIT_SCRIPT` constant (line ~26), and the inline `<script>` tag in `<head>` (line ~123). The `<html data-palette={settings.defaultPalette}>` attribute stays — that's now the only source of truth.

After the change, the `<head>` block becomes just the SSR markup Next.js generates (no manual `<script>` tag).

- [ ] **Step 5: Verify no remaining references.**

Run: `grep -rn 'PALETTE_COOKIE\|writePaletteCookie\|vio-palette\|PALETTE_INIT_SCRIPT\|palette-switcher' --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules | grep -v .next | grep -v worktrees | grep -v docs/`
Expected: zero matches. (Hits inside `docs/` are fine — that's the spec.)

- [ ] **Step 6: Run lint + test + build.**

Run: `npm run lint && npm test && npm run build`
Expected: all green. The build is the hard check — it'll fail if any consumer still imports the removed symbols.

- [ ] **Step 7: Commit.**

```bash
git add shared/config/palettes app/[locale]/layout.tsx
git commit -m "refactor(palettes): remove per-user palette cookie + inline init script"
```

---

## Task 6: Clean up unused CSS and translations

**Files:**
- Modify: `app/globals.css`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`

- [ ] **Step 1: Remove the `.palette-sweep` CSS rule from `app/globals.css`** (lines ~621-635 — the block starting with `/* Palette-sweep one-shot wash (consumed by palette-switcher). */`).

- [ ] **Step 2: Remove the `@keyframes paletteSweep` definition** (lines ~417-429).

- [ ] **Step 3: Remove the `PaletteSwitcher` namespace from all three messages files** (`messages/en.json`, `messages/ru.json`, `messages/be.json`). In each, delete the entire `"PaletteSwitcher": { ... }` block including its 12 palette names. This was the namespace consumed by the deleted switcher; the form uses palette `name` from `PALETTES` directly.

- [ ] **Step 4: Remove `Admin.persistence_note` from all three messages files.** This was the caption under the deleted palette section.

- [ ] **Step 5: Verify no remaining consumers of the removed translation keys.**

Run: `grep -rn 'PaletteSwitcher\|persistence_note' --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules | grep -v .next | grep -v worktrees | grep -v docs/`
Expected: zero matches outside `docs/`.

- [ ] **Step 6: Run lint + test + build.**

Run: `npm run lint && npm test && npm run build`
Expected: all green.

- [ ] **Step 7: Commit.**

```bash
git add app/globals.css messages/en.json messages/ru.json messages/be.json
git commit -m "chore: drop unused palette-sweep CSS and PaletteSwitcher translations"
```

---

## Task 7: Final verification

Use @superpowers:verification-before-completion.

- [ ] **Step 1: Run the full local pipeline.**

```bash
npm run lint && npm test && npm run build
```
Expected: all green. Report actual output, not a paraphrase.

- [ ] **Step 2: Manual smoke check in the dev server.**

```bash
npm run dev
```

In a browser (or via the Playwright MCP server):

1. Navigate to `/en/admin/site-settings`. Confirm the palette section matches the screenshot — 12 pills with 3-swatch previews, "Aubergine" selected.
2. Click "Moss". The pill becomes selected; no palette change is visible elsewhere yet (form-only state).
3. Click "Save". Confirm the success message renders.
4. Open `/en/home` in an incognito window. Confirm the page renders with the Moss palette.
5. In the same incognito window, open dev tools → Application → Cookies. Confirm no `vio-palette` cookie was set.
6. Inspect `<html>` in the rendered page. Confirm `data-palette="moss"` is the SSR-rendered attribute and the page `<head>` contains no inline `<script>` for palette.
7. Navigate to `/en/admin`. Confirm there is no palette section on the admin home, and the hero copy is the new generic one.

Stop the dev server.

- [ ] **Step 3: Push and open a PR.**

Use @pr-description. Title suggestion: `feat(site-settings): palette becomes a site-wide admin setting`. Body should summarize the three concrete changes (form UI, deletion, cookie removal) and link to the spec.

---

## Rollback notes

- If the manual smoke check shows a flash of the wrong palette on first paint, the SSR `data-palette` is being overridden somewhere unexpected — check for any remaining cookie-reading code or service workers that might cache an old `<head>`.
- If a user reports a stuck-old palette, ask them to refresh; the stale `vio-palette` cookie is now inert (nothing reads it) but will be cleared by browsers at its 1-year expiry. No server-side action needed.
