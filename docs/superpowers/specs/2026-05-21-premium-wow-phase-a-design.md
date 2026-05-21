# Premium Wow — Phase A design

**Source spec:** `docs/handsoff/violetik - Premium Wow Upgrade.md`
**Branch:** `feature/premium-wow` off `develop`
**Scope:** Phase A of a multi-phase rollout. Lands the foundation (tokens, primitives, magnetic button, palette sweep) and applies a visible wow layer (Aurora background, materiality, magnetic gold CTAs) across every customer-facing route.

## Why phase, why this slice

The full handoff is sized as 14 sequential PRs (§17 of the source spec). Folding all of it into one PR would be unreviewable and risky. Phase A is the slice that delivers the most visible *wow* with the least invasive change to existing page structure: ambient depth (Aurora) + pointer-reactive depth (SpotlightCard) + a magnetic gold button on the loud CTAs + a palette sweep that turns palette switching into a moment. Each later phase is a clean follow-up.

Deferred to follow-up PRs: shared-element morphs (§6.1, §9.2, §7.3), drag-inertia gallery (§5.3), atelier-motion section (§5.5), per-section choreography for booking (§7.2), confetti ring upgrades (§8.3), onboarding parallax slides (§9a), services-catalog row dot-leader morph (§9b.3), live atelier hours (§15), full materiality sweep on every legacy card (§13 in full), the type pass (§12), and the QA gate (§16).

## Architecture

**New shared/ui primitives**, each a stand-alone slice with story + Vitest test, matching the `shared/ui/button` shape:

- `shared/ui/spotlight-card` — pointer-reactive radial highlight on any block. Sets `--mx` / `--my` via raw DOM mutation in a `pointermove` listener (no React re-render). Honors reduced motion via the existing CSS rule (`.spotlight::after { transition: none }`).
- `shared/ui/aurora` — three blurred radial blobs, `position: absolute -z-10 pointer-events-none`, animated by `var(--animate-aurora)`. Pure CSS. Re-tints automatically when palette changes because blobs reference `var(--color-accent)`, `var(--color-violet)`, `var(--color-plum)`.
- `shared/ui/magnetic-button` — wraps a `Button` (or `Link` styled as one) with a `pointermove` listener that translates the button's center toward the pointer (max ±8px) via `useSpring`. Gated by `(hover: hover)` media query + `useReducedMotion()`. Default is non-magnetic; sites that want magnetism import and use this wrapper. Co-locates with `shared/ui/button`.

**Extensions:**

- `app/globals.css` — adds shadow scale, blur tokens, four new keyframes (`aurora`, `sealRotate`, `inkBloom`, `ruleDraw`), `.spotlight`, `.stroke-draw`, `.gilded-lift` utilities. All defined as @theme tokens or top-level utilities — no JS config.
- `features/palette-switcher` — on palette pick, spawn a one-shot full-viewport radial wash that scales from pointer position and apply `data-palette` at the animation midpoint.

**Cross-cutting application:**

- `<Aurora intensity="subtle" />` mounted behind the hero on: `/welcome` (vivid), `/home`, `/confirmation`, `/sign-in`, `/master`, `/membership`, error & 404 pages.
- `<SpotlightCard>` adopted on: home signatures rows, services-catalog menu rows, gallery items, membership tier cards, master testimonial cards, profile quick-links rows.
- Magnetic gold button used on: welcome primary CTA, home hero primary CTA, membership featured-tier CTA, master "Reserve with Violetta" CTA, booking continue CTA, services-detail sticky CTA, confirmation "Add to calendar" CTA.
- `.gilded-lift` applied to: home membership card, master hero portrait, membership featured tier, profile next-visit card, sign-in card.

## i18n

No new visible copy required. Aurora and SpotlightCard are decorative; magnetic button uses existing labels.

## Testing

- Each new primitive ships with: (a) Vitest unit test (render, pointer behavior, reduced-motion check), (b) Storybook story with at least two states.
- Existing pages that change get a smoke test added only where structural behavior is affected (e.g., palette-switcher sweep doesn't break palette change). Visual polish is verified by manual screen recording — out of scope for unit tests.
- Pre-commit Husky hook (lint + Vitest) runs all of this; pre-push runs the build.

## Out of scope (explicit)

Everything listed under "Deferred to follow-up PRs" above. Each will get its own PR, brainstormed individually when picked up.

## Done when

`npm run lint`, `npm test`, `npm run build` are green on `feature/premium-wow`. A user loading `/welcome` sees the vivid aurora + magnetic CTA + palette sweep on first interaction. Every primary CTA across the customer-facing app feels alive on a desktop pointer. PR open against `develop`.
