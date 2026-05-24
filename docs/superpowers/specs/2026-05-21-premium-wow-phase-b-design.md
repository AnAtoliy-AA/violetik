# Premium Wow — Phase B design

**Source spec:** `docs/handsoff/violetik - Premium Wow Upgrade.md`
**Branch:** `feature/premium-wow-phase-b` off `develop`
**Follows:** Phase A (foundation primitives + Aurora across all pages, PR #35).

## Why phase, why this slice

Phase A landed the foundation. Phase B adds **cinematic choreography on the booking funnel** — the three screens a first-time visitor sees on the way to (and after) booking. The slice is sized so it's still one reviewable PR.

Out: shared-element morphs across page navigations (§6.1, §9.2). They need an app-shell route-transition layer (`LayoutGroup` + custom router transition) that's a self-contained PR. Defer to Phase C.

## Scope

1. **Home — drag-inertia gallery strip (§5.3)** — replace the existing horizontal scroll in [`views/home/ui/sections/gallery-strip.tsx`](views/home/ui/sections/gallery-strip.tsx) with a `motion.div` that has `drag="x"`, `dragConstraints`, `dragElastic`. Cards lift on hover.

2. **Home — Atelier in motion (§5.5)** — new section [`views/home/ui/sections/atelier-motion.tsx`](views/home/ui/sections/atelier-motion.tsx) between gallery-strip and testimonial-card. Three vertical hairline-bordered cards each holding a 4-second looping `<video>` (empty `<source>` for now; wire to real clips later). Captions are mono eyebrows. New copy: `Home.atelier_motion_title` + three caption keys, in all three locales.

3. **Service detail — hero theater (§6.2–§6.4)** — verify the parallax `scale 1→1.18` over first 320px is wired (it is, at 1→1.2 today; tune to spec); confirm dropcap on first paragraph; "What it includes" numerals upgrade to italic display 56px with gilded gradient.

4. **Confirmation — push the wow further (§8)** —
   - Ink-bloom pre-roll: a full-bleed overlay that fades the seal in with `var(--animate-ink-bloom)`.
   - Counter-rotating inner ring on the golden seal (slow, infinite, opposite direction).
   - Confetti bump 18 → 28 with per-dot rotation, and 4 of the 28 rendered as 6px hairline rings instead of solid dots.
   - Headline "type-on": each word fades in with `y: 8 → 0` staggered 60ms after the seal lands.
   - "Add to calendar" CTA gets a 1px gilded animated border (background-position shift on hover).

## What's not changing

- No shared-element page transitions (defer to Phase C).
- No onboarding parallax slides (Phase C).
- No type pass / materiality sweep / atelier hours / QA gate (later phases).
- No new entity data, no DB changes.

## Testing

- Existing unit tests cover the touched files; add tests where new components ship.
- New `atelier-motion` section gets a smoke test that asserts it renders the three caption strings.
- Confirmation gets a smoke test on the headline word-stagger structure.
- Pre-commit (lint + Vitest) + pre-push (build) run as usual.

## Done when

`npm run lint`, `npm test`, `npm run build` are green. A user walking `/home → /services → /services/[id] → /booking/* → /confirmation` sees: a magazine-like drag-inertia gallery on home, the new "Atelier in motion" video strip, a calm parallax service-detail hero, and a confirmation page that opens with an ink-bloom curtain and a counter-rotating seal. PR open against `develop`.
