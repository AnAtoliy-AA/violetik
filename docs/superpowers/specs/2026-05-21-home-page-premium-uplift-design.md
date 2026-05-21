# Home page — premium uplift ("Atelier")

Status: draft · Owner: design + frontend · Target: PR #1 of the page-by-page premium uplift series

## Goal

Push the home page (`views/home`) from "polished editorial" to "atelier-grade premium" without touching information architecture or copy. Establish the cross-cutting design vocabulary (paper grain, gold hairlines, glass highlights, letterpress rules, drop caps, foil-stamp CTAs) that subsequent page PRs will reuse.

Non-goals: no IA changes, no new sections, no copy rewrites, no new translations, no palette additions, no e2e behaviour changes, no admin/auth pages.

## Why now

The home page is the front door. Every later page (services, booking, master, gallery, membership) will inherit the design tokens and primitives introduced here. Doing home first means subsequent PRs reduce to "apply the new primitives" with very little new system work.

## Design vocabulary (new tokens & primitives)

All additions are additive — existing classes and components keep their current behaviour. Components below are FSD `shared/ui/` slices with the canonical `index.ts` + `ui/*.tsx` + `*.stories.tsx` + `*.test.tsx` shape (mirroring `shared/ui/plate`).

1. **Paper grain** (`shared/ui/paper-grain/`)
   - Fixed-position, `pointer-events-none`, `aria-hidden` SVG-noise overlay rendered at the root of the home view (not yet global).
   - `opacity ~0.035` over the bg, `mix-blend-mode: overlay`.
   - Inline SVG data URI (no network request). Reduced-motion: unaffected (it's static).

2. **Letterpress rule** (`shared/ui/letterpress-rule/`)
   - A 1px hairline rule with a soft gold falloff at both ends (gradient `transparent → accent/60 → accent → accent/60 → transparent`).
   - Renders under section display titles (signatures, gallery strip, testimonial, membership).
   - Replaces ad-hoc spacing in current sections — keep ornament for the footer.

3. **Folio numeral** — extend the existing `Plate` primitive
   - Add optional `folio?: boolean` prop. When `true`, render the padded number as a large display-serif numeral (e.g. `font-display text-[88px] italic`) anchored to the section's left margin with the existing mono "PLATE 0X · LABEL" eyebrow stacked beside it.
   - Default `false` → existing rendering preserved (no visual diff on other pages).

4. **Drop cap** — utility class `.dropcap` in `app/globals.css`
   - Applies to `:first-letter` of marked paragraph: `font-display`, `float-left`, `text-[56px]`, `leading-[0.85]`, `mr-2 mt-1.5`, `text-gold`.
   - Applied to `hero_paragraph` (HomeHero) and `membership_blurb` (MembershipCard) only.

5. **Gilded border** — utility class `.gilded` in `app/globals.css`
   - `border: 0.5px solid transparent` + `background: linear-gradient(var(--color-surface), var(--color-surface)) padding-box, var(--gold-grad) border-box`.
   - Replaces flat `border-line` on the announcement capsule, membership card and testimonial card. (Master strip and gallery tiles keep the existing subtle line — we don't gild every card.)

6. **Glass highlight** — utility class `.glass-top` in `app/globals.css`
   - `box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25);` — subtle top-edge light, bottom-edge shadow. Applied to cards that adopt `.gilded`.

7. **Foil-stamp gold button** — refine `shared/ui/button` `variant="gold"`
   - Add `inset 0 1px 0 rgba(255,255,255,0.35)` highlight + `inset 0 -1px 0 rgba(0,0,0,0.25)` shadow.
   - Add a hover-state shimmer (re-use existing `--animate-shimmer` on the gold gradient `background-position`).
   - No API change — existing call sites unaffected.

## Section-level changes (within `views/home/ui/sections/`)

Each section keeps its file boundary; edits are localized.

### `home-hero.tsx`
- Wrap the whole hero in a relative container that hosts the new `<PaperGrain />` overlay.
- Add `.dropcap` to the lead paragraph.
- Tighten the title's letter-in animation: stagger the three lines by 80ms (already mostly there via `motion`); add a thin letterpress rule under the title.
- Replace flat `border` on the fan-frame area (none today) with a subtle gold hairline frame around the `NailFan` decorative element so it reads as a tipped-in plate.

### `announcement-capsule.tsx`
- Swap `border-[0.5px] border-line-strong` → `.gilded .glass-top`.
- Replace the static left bar with the same gold but add a soft pulsing dot (the existing `--animate-soft-pulse`) as a "live" indicator over the bar.

### `signatures-list.tsx`
- Add `folio` prop to the section's `Plate` so it renders as a large folio numeral.
- Add a letterpress rule under the "Signatures." display heading.
- Add hover micro-tilt on each `ServiceCard` link: `hover:rotate-[0.3deg] hover:scale-[1.005] hover:[box-shadow:...]` — respect `prefers-reduced-motion` (skip the transform).

### `master-strip.tsx`
- Replace flat surface-2 gradient with `.gilded .glass-top`.
- Replace the painted radial avatar with a concentric-ring lacquer drop (two concentric `border-[0.5px] border-accent/60` rings with a tighter inner radial — gives a "polished cabochon" feel).

### `gallery-strip.tsx`
- Convert `Plate` to `folio`.
- Wrap each tile in a subtle gold hairline frame (`.gilded` on the `<Link>`) but keep the existing surface gradient for the tile body.
- Add hover micro-tilt (skip on reduced motion).
- Replace the existing top-left "Nº 01" label with a small mono folio in serif-italic.

### `testimonial-card.tsx`
- Increase quote size to `text-[28px]` and add a hanging-indent layout: the oversized opening `"` quote-mark sits to the left of the text column, not floating in the background. Keep it as a decorative `aria-hidden` span using `text-gold` (gradient).
- Add `.gilded .glass-top` to the card.
- Add letterpress rule above the attribution.

### `membership-card.tsx`
- Apply `.gilded .glass-top`.
- Apply `.dropcap` to `membership_blurb`.
- Add a small "foil-stamp" gold seal (24×24, the existing `nail-tile` star variant or a new tiny SVG monogram) in the top-right corner, partially clipped — gives the card a "card-stock with embossed seal" feel.

### `home-footer.tsx`
- Add a tiny monogram seal (uppercase italic `V` set inside a gold ring) above the wordmark.
- Keep `Ornament` and the colophon lines as-is.

## File-level diff (anticipated)

**Net new (`shared/ui/`)**
- `shared/ui/paper-grain/` (index.ts, ui/paper-grain.tsx, ui/paper-grain.stories.tsx, ui/paper-grain.test.tsx)
- `shared/ui/letterpress-rule/` (index.ts, ui/letterpress-rule.tsx, ui/letterpress-rule.stories.tsx, ui/letterpress-rule.test.tsx)
- `shared/ui/monogram-seal/` (index.ts, ui/monogram-seal.tsx, ui/monogram-seal.stories.tsx, ui/monogram-seal.test.tsx)

**Modified (`shared/ui/`)**
- `shared/ui/plate/ui/plate.tsx` — add `folio?: boolean` (default false; existing behaviour preserved)
- `shared/ui/plate/ui/plate.stories.tsx` — add `Folio` story
- `shared/ui/plate/ui/plate.test.tsx` — add folio rendering test
- `shared/ui/button/ui/button.tsx` — refine `gold` variant inner shadows; no API change

**Modified (`app/`)**
- `app/globals.css` — add `.dropcap`, `.gilded`, `.glass-top` utility classes; no token edits

**Modified (`views/home/ui/sections/`)**
- All 8 section files per the section-level changes above

**No changes to**
- `app/[locale]/home/page.tsx`
- `messages/*.json` — no new translations
- `i18n/*`, `proxy.ts`, palette CSS variables, FSD layering rules

## Architecture & FSD compliance

- New primitives live in `shared/ui/` with their public API exported via `index.ts`. Only `views/home` imports them in this PR.
- `Plate`'s additional optional prop preserves backward compatibility — no other call sites need changes.
- `globals.css` additions are pure utility classes, no token mutations, no `@theme` edits.
- Each new shared/ui slice ships with a Storybook story and Vitest test, per the `new-ui-component` project skill.
- Home view tests (if any) keep passing without modification; the design changes are additive, not behavioural.

## Accessibility

- All decorative additions (paper grain, monogram seal, letterpress rule) carry `aria-hidden="true"` and `role="presentation"` where applicable. They are non-interactive.
- Drop cap is a `:first-letter` style — preserves DOM order and screen-reader output unchanged.
- Hover micro-tilt and shimmer respect `prefers-reduced-motion: reduce` via the existing media query in `globals.css` (which already nulls transitions and our keyframes).
- Color contrast: gold-on-bg accent text remains `--color-accent` (already AA on bg). Drop cap uses `text-gold` gradient — purely decorative; the rest of the paragraph remains `--color-text-2`.

## Testing strategy (TDD)

For each new `shared/ui/` primitive (paper-grain, letterpress-rule, monogram-seal):
1. **Red**: Vitest test asserting render with `role="presentation"` / `aria-hidden`, decorative-only DOM, `className` merge, no interactive children.
2. **Green**: implement minimum to pass.
3. **Story**: add canonical Storybook story (Storybook test target runs in the browser project).

For `Plate.folio`:
1. **Red**: test that with `folio={true}` the padded numeral appears in a `font-display` element and the eyebrow text still renders.
2. **Green**: branch the render path.

For `Button.variant="gold"` shadow refinement:
1. **Red**: snapshot the gold variant's `className` includes the new shadow utilities and existing usage still passes the canonical test.

Section-level edits don't get dedicated Vitest tests (existing home page covers them indirectly). They get visual coverage from Storybook stories for each new primitive used.

Manual smoke test before opening PR:
- `npm run dev` then visit `/en/home`, `/ru/home`, `/be/home`.
- Toggle palette via `PaletteSwitcher` — verify gilded borders + drop cap colour adapt to each palette.
- Toggle `prefers-reduced-motion` in DevTools — confirm no transforms or shimmers fire.

## Verification gate

Before opening the PR, run:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run build-storybook`

…and paste output into the PR description per `superpowers:verification-before-completion`.

## Out of scope (parked for later PRs)

- Cross-page promotion of `.gilded`, `.glass-top`, `.dropcap` to other views — happens in subsequent page PRs as those views are uplifted.
- Promotion of `<PaperGrain />` from per-page to global root layout — wait until at least 3 pages adopt it; revisit when finishing services/master.
- New photography or imagery sourcing.
- Animation library swaps; we keep `motion/react`.
- Palette additions or `@theme` token changes.

## Rollback

Every change is additive or strictly localized to home sections. To roll back, revert the single PR. No data migrations, no env changes, no flag wiring.
