# Premium Wow — Phase C design

**Source spec:** `docs/handsoff/violetik - Premium Wow Upgrade.md`
**Branch:** `feature/premium-wow-phase-c` off `develop`
**Follows:** Phase A (PR #35 — foundation + Aurora coverage), Phase B (PR #36 — booking-funnel cinematics).

## Why phase, why this slice

The booking funnel is alive; everything around it is still quiet. Phase C polishes the rest of the customer chrome — onboarding, tab bar — and adds **studio presence** via the atelier-hours line under the home header (§15 — "the app is connected to a real studio"). It also sweeps the services catalog with hover micro-interactions (§9b.3, §14).

Out: shared-element page transitions (§6.1, §9.2). Those need a custom App Router transition layer; they remain a self-contained Phase D.

## Scope

1. **Atelier hours live presence (§15)** — a new `widgets/atelier-hours` slice that renders one line below the home header: `Open · Wed 11:00 → 19:00` or `Closed · Opens Wednesday`, computed from the existing [`shared/lib/google-calendar/working-hours.ts`](shared/lib/google-calendar/working-hours.ts). A soft-pulsing `softPulse` dot — green if open, gold if closed. Server-rendered with `revalidate = 60`.

2. **Tab bar polish (§9i)** —
   - Active pill gets a 1px gilded ring that fades in when the pill arrives.
   - Inactive icons sit at `opacity: 0.5`, lift to `1` as the pill approaches (distance-weighted via the pill's `x` motion value).
   - Glassy backdrop already exists; verify `var(--backdrop-blur-lg)` is applied.

3. **Onboarding parallax slides (§9a)** —
   - 700ms slide transition between cards with `easeInOut`; outgoing hero scales `1 → 1.08` while incoming eases `1.08 → 1` ("passing the lens").
   - Active dot animates via `motion.div layoutId="onboard-dot"` between positions, expanding to `22 × 4 px` gold pill from a `6 × 4 px` muted nub.
   - Drag parallax: inside each card, the hero image gets a `useTransform(dragX, [-200, 0, 200], [12, 0, -12])` translateY.
   - Skip button moves top-right (eyebrow style); dismisses to `/home`.
   - Honor reduced-motion: skip parallax + scale; keep a 200ms opacity cross-fade.

4. **Services-catalog row micro-interactions (§9b.3, §14)** — hover on a menu row:
   - Title slides `translateX(4px)`,
   - Price swaps from `text-gold` to `text-gold-shimmer`,
   - The thumbnail scales `1 → 1.03`.
   These are decorations on the existing `SpotlightCard` wrap from Phase A.

5. **Materiality sweep — small (§13 partial)** — audit current `bg-surface rounded-lg` cards: pick at most 3 raw surfaces and apply `gilded`. Don't sweep the whole codebase; keep diff focused.

## Not in scope

- Shared-element page transitions (Phase D).
- Type pass (§12) — large + risky; later.
- Full materiality sweep (§13 full).
- Admin polish (§9g) — internal, not customer-facing wow.
- Master/membership/profile deep polish (§9c–§9e) — those got their main upgrades in Phase A.
- QA gate (§16) — final pass.

## Testing

- New `widgets/atelier-hours` slice ships with a Vitest unit test for the open/closed computation + label fallback.
- New translations (`AtelierHours.*`) added to all three locales.
- Onboarding parallax has an existing e2e test that mustn't regress; add a smoke test for the layoutId-based dot.
- Pre-commit (lint + Vitest) and pre-push (build) run.

## Done when

Lint, Vitest (existing + new), and build all green. On `/home` the user sees a small live "Open" line under the header that pulses; the tab bar's active pill is more clearly gold-ringed; onboarding feels like a real pager with a parallax photo; services menu rows feel responsive on a desktop pointer. PR open against `develop`.
