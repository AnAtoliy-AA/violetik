# Premium Wow — Phase D design

**Source spec:** `docs/handsoff/violetik - Premium Wow Upgrade.md`
**Branch:** `feature/premium-wow-phase-d` off `develop`
**Follows:** Phase A (PR #35), Phase B (PR #36), Phase C (PR #37).

## Why phase, why this slice

The customer routes now feel like a magazine. This phase quiets the **typographic and material noise** that's still uneven across pages, and dresses the admin in the same coat (without bringing the customer wow to admin — restraint, not theatre, per §9g).

Out: shared-element page transitions (§6.1, §9.2) — those need a custom View Transitions or layout-level transition layer that's its own self-contained PR. They become Phase E.

## Scope

1. **Type pass (§12)** —
   - Add `--text-h1`, `--text-h2`, `--text-h3` tokens to `app/globals.css`'s `@theme {}` so Tailwind auto-generates `text-h1` / `text-h2` / `text-h3` utilities.
   - Enable Cormorant ligatures + alts on `.font-display` via `font-feature-settings: "liga", "dlig", "ss01"`.
   - Sweep `views/welcome`, `views/home`, `views/services-catalog`, `views/service-detail`, `views/master`, `views/membership` for ad-hoc `text-[clamp(...)]` headings — keep clamps that aren't just h1/h2/h3 (e.g. wordmark sizing), but replace ones that match the new tokens.

2. **Materiality sweep — focused (§13 partial)** — audit a handful of remaining `bg-surface` raw surfaces and apply `gilded` or `gilded-lift`. Pick the most visible ones (announcement capsule, testimonial card, master-strip) without sweeping every helper.

3. **Form input floating label (§14)** — add a new `shared/ui/floating-input` primitive (no story+test): mono eyebrow placeholder that morphs to italic eyebrow on focus, gilded underline that draws on focus. Used by future booking inputs.

4. **Admin chrome (§9g)** —
   - `<AppHeader>` carries a mono eyebrow `· ADMIN ·` slot when the route is under `/admin`.
   - All admin cards → `.gilded` (not `gilded-lift` — distractions removed). Sweep `/admin`, `/admin/bookings`, `/admin/vip-requests`, `/admin/site-settings`, `/admin/integrations/google`.
   - Admin headers/tables get hairline `<LetterpressRule>` between rows. Column headers in mono eyebrow.
   - Admin action buttons keep `solid` / `ghost` — explicitly no gold (gold is customer-facing only).
   - Connect-Google chip adds a soft-pulsing green dot when connected (reuse the `softPulse` token).

## Not in scope

- Shared-element page transitions (Phase E).
- QA gate (§16) — final pass, Phase E.
- Toast / inline error polish (§9g.7) — depends on a toast primitive that doesn't exist yet.

## Testing

- New `shared/ui/floating-input` ships with Vitest test for focus state.
- `widgets/app-header` gets a test for the admin eyebrow when given the `adminContext` prop.
- Existing tests must remain green — the type sweep is purely class renames.
- Pre-commit (lint + Vitest) + pre-push (build) run.

## Done when

Every customer page heading is one of `text-h1` / `text-h2` / `text-h3`; admin pages wear the gilded coat with the ADMIN eyebrow; lint, tests, and build are all green. PR open against `develop`.
