# Premium Wow — Phase E design

**Source spec:** `docs/handsoff/violetik - Premium Wow Upgrade.md`
**Branch:** `feature/premium-wow-phase-e` off `develop`
**Follows:** Phase A (#35) — foundation, Phase B (#36) — booking-funnel cinema, Phase C (#37) — studio presence + onboarding, Phase D (#38) — type pass + admin chrome.

## Why phase, why this slice

This is the last bit of the source brief — the "single biggest perceived-quality win" (§6.1 + §9.2: shared-element morphs across page navigation) and the §16 QA gate that hardens the work before shipping.

Until phase E we deferred §6.1/§9.2 because cross-route layoutId animation isn't natural in Next App Router. **Next.js 16 ships React's `<ViewTransition>` component**, which integrates with the browser's View Transitions API and morphs elements across navigations declaratively — no manual position tracking, no AnimatePresence at the layout level. We adopt that here.

## Scope

1. **Enable `experimental.viewTransition: true`** in [`next.config.ts`](next.config.ts).

2. **Service hero morph (§6.1)** — the spec's flagship "single biggest perceived-quality win."
   - Wrap the source thumbnail inside [`entities/service/ui/service-card.tsx`](entities/service/ui/service-card.tsx) and [`entities/service/ui/service-menu-item.tsx`](entities/service/ui/service-menu-item.tsx) in `<ViewTransition name={`service-hero-${service.id}`}>`.
   - Wrap the destination hero tile inside [`views/service-detail/ui/sections/detail-hero.tsx`](views/service-detail/ui/sections/detail-hero.tsx) in the same `<ViewTransition>` name.
   - Browsers without View Transitions degrade to the existing instant navigation.

3. **Gallery lightbox morph (§9.2)** — currently uses motion's `layoutId="gallery-image-${id}"` for the in-page grid → lightbox morph (Phase A leaves that intact since both source and dest are in the same React tree). View Transitions aren't needed here. **Verify** the existing flow still works after Phase D changes.

4. **QA gate (§16)** —
   - **Reduced-motion sweep**: walk every new motion site added in phases A–D and confirm `useReducedMotion()` / `prefers-reduced-motion` is honored.
   - **Keyboard sweep**: every interactive control gets a focus-visible ring (it's already opt-in via the shared `focus-visible:ring-accent` pattern); add an audit note.
   - **Lighthouse budgets**: existing `lighthouserc.json` budgets stay the floor. The view-transition additions are CSS only, no JS — perf cost is zero outside the morph itself.
   - **E2E**: existing Playwright suite covers welcome / home / booking. Add a smoke spec asserting the view-transition attributes are present on a service detail navigation.

## Not in scope

- Real photography for `NailTile` / `AtelierMotion` (§18 — out of brief).
- Real admin auth gating (§18 — exists today, no change).
- New locales beyond en/ru/be.
- Booking back-end changes.

## Testing

- New Vitest is light — `<ViewTransition>` is a React feature, not something we can shallow-test in jsdom. The smoke spec is Playwright.
- Existing 340 tests must remain green.
- Pre-commit (lint + Vitest) + pre-push (build) gate as usual.

## Done when

`npm run lint`, `npm test`, `npm run build` are all green. Walking `/services → /services/[id]` in a Chromium-based browser morphs the thumbnail into the detail hero. Reduced-motion users see the same final state without animation. PR open against `develop`. The premium-wow brief is delivered end-to-end.
