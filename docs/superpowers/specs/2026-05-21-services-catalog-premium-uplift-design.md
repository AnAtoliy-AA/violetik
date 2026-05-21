# Services catalog (`/services`) — premium uplift ("Atelier" part 2)

Status: draft · Owner: design + frontend · Target: PR #2 of the page-by-page premium uplift series · Follows: [2026-05-21-home-page-premium-uplift-design.md](2026-05-21-home-page-premium-uplift-design.md)

## Goal

Apply the established "Atelier" design vocabulary (`PaperGrain`, `LetterpressRule`, `MonogramSeal`, `.gilded`, `.glass-top`, `.dropcap`, `Plate folio`, foil-stamp `Button.gold`) to `views/services-catalog` and the `entities/service` menu item it composes. No new shared primitives — pure application of the system shipped in PR #31.

Non-goals: no new categories, no new translations, no new data, no IA/route changes, no service detail page changes (that's PR #3).

## Why now

Services catalog is the next page on the user's premium-uplift loop. The home page (PR #31) introduced the vocabulary; the catalog is the first reuser. If anything's missing from the system it will surface here.

## Cross-cutting moves on `views/services-catalog`

### Hero masthead (`services-catalog-page.tsx`, lines ~44-55)

Currently: thin `border-b` row with two mono eyebrows ("A la carte" / "06 Rituals"), then `<h1>` and a paragraph.

Move to:
- Wrap the hero section in a relative container hosting `<PaperGrain />` (z-0), with content lifted via `relative z-10`.
- Replace the two-column eyebrow row with a single `Plate folio` (`number={0}` rendered as "00", `label={t("plate_alacarte").toUpperCase()}`) for a true masthead numeral. The "06 Rituals" eyebrow becomes a small text-accent tag in the same flex row (right-aligned), preserving the existing copy.
- Add `LetterpressRule` between the title and the paragraph.
- Apply `.dropcap` to the lead `<p>`.

### Category chips (`category-chips.tsx`)

Currently: pills with `border-line-strong` (unselected) and `bg-text text-bg` (selected).

Move to:
- Unselected chips use `.gilded` for a gold hairline border (replacing flat `border-line-strong`).
- Selected chip uses the gold gradient — class-list equivalent to `Button.gold` foil-stamp (`bg-gold` + foil-stamp inner shadow + 200%-width bg + text-bg). Keep `role="tab" aria-selected` for a11y.
- Hover state on unselected: subtle `text-text` (already present) + faint scale on the inner text — keep minimal so chips don't dance.
- Active indicator: instead of just colour, add a tiny gold seal (`size-1 bg-gold rounded-full`) below the chip on the selected one, anchored via absolute position — or, alternatively, an underline using a thin letterpress hairline. **Decision: keep it pill-only, no underline — the gold pill already reads as selection. Letterpress underline would crowd it.**

### Service menu items (`entities/service/ui/service-menu-item.tsx`)

Currently: bordered `<article>` row with a left `NailTile` thumbnail, mono plate number, dotted hairline, italic name + price, mono meta, paragraph.

Move to:
- Replace the dotted `border-line-strong` between plate-number and name with a `LetterpressRule` (so the dotted-engraved feel is consistent with home).
- Promote the plate number "01" / "02" from `font-mono text-[9px] text-accent` to `font-display text-[18px] italic text-gold` (gradient-clipped) — a folio numeral inline. Keep accessibility (decorative number, name is the link target via the wrapping `<Link>` in catalog).
- Wrap the `NailTile` thumb in `.gilded` so each thumbnail gets a gold hairline frame; add a small `glass-top` inset highlight.
- Price gets a foil-stamp treatment: wrap the existing `€{price}` span in a `.gilded` pill (rounded-full padding-x) with the gold-shimmer text.
- Hover lift: keep the existing `hover:translate-x-1`, add `motion-reduce:hover:translate-x-0`.
- Apply a soft fade-in via `floatIn` keyframe (already in globals) when the list is filtered — but only if it doesn't fight motion-reduce. Decision: skip — filter switches are fast enough that motion is noise.

### List frame (`services-catalog-page.tsx`, the `<div className="px-[22px] pb-7 pt-[22px]">…</div>` wrapper)

Currently: plain horizontal padding on the body.

Move to: keep the wrapper as-is — the items are listed as rows separated by their own border-b. Wrapping the whole list in a `.gilded .glass-top` card would compete with each row's own border. Skipping.

### Empty state (lines ~67-69)

Currently: centered grey paragraph.

Move to:
- Add `<Ornament />` above the message (the existing `shared/ui/ornament` rule used in the home footer) so the empty state reads as deliberate, not an oversight.
- Use `font-display italic` for the message — feels like a stage curtain.

## Architecture & FSD compliance

- All new imports in `views/services-catalog` and `entities/service` are from `shared/ui/`. No layer violations.
- `entities/service/ui/service-menu-item.tsx` is the only file outside `views/services-catalog` that this PR modifies. `ServiceMenuItem` is currently only consumed by the catalog (verified by grep) — no callers elsewhere to consider.
- No new `messages/*.json` keys. Existing keys cover all visible copy.
- `app/[locale]/services/page.tsx` untouched.
- `category-chips.tsx` keeps its public API (`CategoryChipsProps`).

## File-level diff (anticipated)

**Modified**
- `views/services-catalog/ui/services-catalog-page.tsx`
- `views/services-catalog/ui/category-chips.tsx`
- `entities/service/ui/service-menu-item.tsx`
- `entities/service/ui/service-menu-item.stories.tsx` — refresh stories so the visual baseline reflects the new treatment
- `entities/service/ui/service-menu-item.test.tsx` — only if assertions still hold; new visual classes should not break existing assertions but verify

**Net new** — none

## Accessibility

- Category chips keep `role="tablist"`, `role="tab"`, `aria-selected`, and `ariaLabel`.
- The Plate folio's large numeral remains the existing decorative pattern — eyebrow text is still in the DOM and read by SR.
- All decorative additions (paper grain, ornament, gold pill backdrop) are `aria-hidden`.
- Drop cap is `::first-letter` — DOM order unchanged.
- Hover translations use `motion-reduce:` modifiers; global `@media (prefers-reduced-motion)` block in `globals.css` already nulls animations/transitions.

## Testing strategy

Existing tests:
- `entities/service/ui/service-menu-item.test.tsx` — verify they still pass after the class/layout shifts. If any assertion was on a specific dotted-border class, update to match the LetterpressRule.
- `views/services-catalog/ui/services-catalog-page.test.tsx` — same; if any assertion was on chip color classes, update.

Add (only if existing coverage is thin):
- A test for `CategoryChips` that asserts the selected chip carries the `bg-gold` class and the unselected ones carry `gilded`. **Decision: include.**

No new vitest files for `services-catalog-page` beyond what exists. The page is a thin composition.

Manual smoke before PR:
- `npm run dev`, visit `/en/services`, `/ru/services`, `/be/services`.
- Toggle each category chip — verify selected styling.
- Toggle palette — verify gilded/gold tones reflow.
- Toggle reduced motion — verify chip transitions still work (color only) and hover translate is suppressed.

## Verification gate

Before opening PR:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run build-storybook`

## Out of scope

- Service detail page (`/services/[id]`) — next PR.
- Adding a search input or sort affordance.
- Reworking the `Category` enum or adding new categories.
- Adding photography or new visual data.

## Rollback

Single revert. No data migrations, no env changes.
