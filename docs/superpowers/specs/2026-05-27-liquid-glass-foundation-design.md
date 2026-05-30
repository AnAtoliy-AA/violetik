# Liquid Glass Foundation — Design

**Date:** 2026-05-27
**Branch:** `feature/liquid-glass-foundation` (off `develop`)
**Ship strategy:** Single PR (per user directive)

## 0 · Context and locked decisions

The brand has shipped Phase 1 (Aurora, MagneticButton, SpotlightCard, palette switcher, view transitions, atelier motion, flame monogram) and is mid-way through the Phase 2 brief ([docs/handsoff/Violetik Next Wave - Premium UX Upgrade.md](../../handsoff/Violetik%20Next%20Wave%20-%20Premium%20UX%20Upgrade.md)). The aesthetic today is "atelier / editorial luxury" — aubergine palettes, gilded matte surfaces, italic display headings, ornamental hairlines.

The user asked to "update app design — start with shared components, add animations, more blur, more liquid glass, more modern, more premium, wow effect." Four decisions came out of the brainstorming session:

| # | Decision | Choice |
|---|---|---|
| 1 | Direction | **B** — Liquid Glass dominant (layered translucent surfaces; gold shifts from filled border to accent-of-light) |
| 2 | Scope | **3** — Foundation + system chrome (tokens, GlassSurface primitive, useLiquidPress hook, 6 primitive upgrades, 5 widget chrome migrations) |
| 3 | Glass character | **W** — Warm atelier glass (aubergine-tinted body, gilded rim) **plus** the iOS-26 specular pointer-tracking highlight and the lens-edge top-rim borrowed in |
| 4 | Ship | **Single PR** (no multi-PR sequencing) |

Out-of-scope items deferred to follow-on specs: view-level migrations (home / service-detail / booking / profile / gallery / admin), per-palette glass tint tuning across all 12 palettes, real performance instrumentation.

The Phase 1 hard constraints still apply: FSD layer rules, locale-prefixed routes with `next-intl`, `motion` (Motion for React) only (never `framer-motion`), `useReducedMotion()` everywhere, Tailwind v4 with new tokens added to [app/globals.css](../../../app/globals.css) `@theme {}`, Server Components by default, Storybook + Vitest required for every `shared/ui/*`, Lighthouse mobile ≥ 92.

---

## 1 · Foundation — tokens, utilities, keyframes

All additive to the existing `@theme {}` block in [app/globals.css](../../../app/globals.css). No existing tokens are removed; existing utility class behaviour does not change.

### 1.1 Backdrop-blur scale

Today the scale is `--backdrop-blur-sm` (8px), `--backdrop-blur-md` (16px sat 160%), `--backdrop-blur-lg` (28px sat 180%). Replace with a six-step scale that adds heavier and lighter rungs, keeping the existing names retuned:

```css
--backdrop-blur-xs:  blur(6px)  saturate(140%);
--backdrop-blur-sm:  blur(10px) saturate(150%);
--backdrop-blur-md:  blur(16px) saturate(160%);
--backdrop-blur-lg:  blur(24px) saturate(170%);
--backdrop-blur-xl:  blur(32px) saturate(180%);
--backdrop-blur-2xl: blur(44px) saturate(200%);
```

The `sm` and `lg` tunings change. [widgets/tab-bar/ui/tab-bar.tsx](../../../widgets/tab-bar/ui/tab-bar.tsx) currently reads `var(--backdrop-blur-lg)` via inline style; this is the only production consumer of the CSS-var tokens and is fully rewritten in §4.2, so the 28px → 24px saturate(170%) retune is benign. The Tailwind utility classes `backdrop-blur-sm` / `backdrop-blur-md` used elsewhere in the codebase ([shared/ui/sheet/](../../../shared/ui/sheet/), [shared/ui/toast/](../../../shared/ui/toast/), [shared/ui/hot-slot/](../../../shared/ui/hot-slot/), [widgets/nav-sheet/](../../../widgets/nav-sheet/)) are Tailwind built-in utilities (pixel-valued, unrelated to the `--backdrop-blur-*` CSS variables). They are **not** changed by this spec. Implementers should not "fix" those references to use the new CSS-var tokens.

### 1.2 Glass tints

```css
--color-glass-warm:   rgba(232, 207, 153, 0.06);   /* faint gilded warmth */
--color-glass-body:   rgba(244, 234, 216, 0.05);   /* neutral cream */
--color-glass-cool:   rgba(244, 234, 216, 0.03);   /* coolest */
--color-glass-clear:  rgba(244, 234, 216, 0.015);  /* near-invisible (thin chrome) */

--color-glass-rim:    rgba(255, 245, 214, 0.55);   /* top-edge lens highlight peak */
--color-glass-edge:   rgba(232, 207, 153, 0.28);   /* side hairline */

--shadow-glass:       0 -28px 56px -22px rgba(0, 0, 0, 0.7);
```

All tints use the existing palette's text colour family at fixed alpha, so they remain palette-agnostic. A glass surface in the `ruby` palette borrows ruby light through the blur naturally; we do not tint glass per palette.

### 1.3 Specular highlight coordinates

```css
--lx: 50%;   /* default centred — overwritten by useLiquidPress */
--ly: 0%;
```

These are written by `useLiquidPress` (§2.2). On surfaces using `.glass-specular`, the pointer position (or last touch point) is read and converted to a percentage.

### 1.4 Utility classes

```css
.glass {
  background: var(--color-glass-body);
  backdrop-filter: var(--backdrop-blur-lg);
  -webkit-backdrop-filter: var(--backdrop-blur-lg);
  border: 0.5px solid var(--color-glass-edge);
  box-shadow: var(--shadow-glass);
}

.glass-warm    { background: var(--color-glass-warm); }
.glass-cool    { background: var(--color-glass-cool); }
.glass-clear   { background: var(--color-glass-clear); }

.glass-xs  { backdrop-filter: var(--backdrop-blur-xs);  -webkit-backdrop-filter: var(--backdrop-blur-xs);  }
.glass-sm  { backdrop-filter: var(--backdrop-blur-sm);  -webkit-backdrop-filter: var(--backdrop-blur-sm);  }
.glass-md  { backdrop-filter: var(--backdrop-blur-md);  -webkit-backdrop-filter: var(--backdrop-blur-md);  }
.glass-lg  { backdrop-filter: var(--backdrop-blur-lg);  -webkit-backdrop-filter: var(--backdrop-blur-lg);  }
.glass-xl  { backdrop-filter: var(--backdrop-blur-xl);  -webkit-backdrop-filter: var(--backdrop-blur-xl);  }
.glass-2xl { backdrop-filter: var(--backdrop-blur-2xl); -webkit-backdrop-filter: var(--backdrop-blur-2xl); }

/* Continuous low-cost shimmer — applied only on heavy panels (.glass-strong contexts).
 * Bound to a class so reduced-motion can disable it without touching consumers. */
.glass-shimmer {
  background-size: 200% 100%;
  animation: var(--animate-glass-shimmer);
}

/* Lens-edge top rim — adds a soft white highlight inset on the top edge. */
.glass-rim {
  position: relative;
  isolation: isolate;
  box-shadow:
    var(--shadow-glass),
    inset 0 1px 0 rgba(255, 245, 214, 0.28);
}
.glass-rim::before {
  content: "";
  position: absolute;
  left: 8%; right: 8%; top: -1px;
  height: 22px;
  background: radial-gradient(50% 100% at 50% 0%, var(--color-glass-rim), transparent 75%);
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  pointer-events: none;
  z-index: 1;
}

/* Pointer-tracked specular highlight — reads --lx / --ly written by useLiquidPress. */
.glass-specular {
  position: relative;
  isolation: isolate;
}
.glass-specular::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    160px 100px at var(--lx, 50%) var(--ly, 0%),
    rgba(255, 255, 255, 0.18),
    transparent 60%);
  opacity: 0;
  transition: opacity 320ms var(--ease-out);
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
}
.glass-specular[data-active="true"]::after {
  opacity: 1;
}
```

### 1.5 New keyframes

```css
/* Liquid press — radial highlight blooms from tap point, surface scales,
 * springs back. Driven by JS scale class toggle; the radial is the ::after
 * of .glass-specular, lit by --lx/--ly. */
@keyframes liquidPress {
  0%   { transform: scale(1);     }
  35%  { transform: scale(0.985); }
  100% { transform: scale(1);     }
}

/* Rim sweep — gold rim runs once along the surface edge after press release.
 * Use on chrome surfaces (tab-bar, app-header) for "active route" feedback. */
@keyframes rimSweep {
  0%   { background-position: -100% 50%; opacity: 0;   }
  50%  {                                 opacity: 1;   }
  100% { background-position:  200% 50%; opacity: 0;   }
}

/* Glass shimmer — continuous low-cost subtle drift. Only on .glass-strong
 * (sheets / heavy panels). 4% peak opacity; barely-there. */
@keyframes glassShimmer {
  0%, 100% { background-position: 0%   50%; }
  50%      { background-position: 100% 50%; }
}

/* New animation tokens consumed via @theme */
--animate-liquid-press:  liquidPress 320ms var(--ease-out);
--animate-rim-sweep:     rimSweep 1400ms var(--ease-out);
--animate-glass-shimmer: glassShimmer 18s ease-in-out infinite;
```

### 1.6 Fallbacks

```css
@media (prefers-reduced-transparency: reduce) {
  .glass, .glass-warm, .glass-cool, .glass-clear {
    background: var(--color-surface);
  }
  .glass-xs, .glass-sm, .glass-md, .glass-lg, .glass-xl, .glass-2xl {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .glass-specular::after,
  .glass-rim::before {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass-shimmer { animation: none; }
  /* liquidPress / rimSweep — already gated by the global reduced-motion
   * block at the bottom of globals.css which zeroes all animation durations. */
}
```

---

## 2 · New primitives

### 2.1 `<GlassSurface />`

The foundational tile. Every glass-surfaced component in the system composes this.

**File:** [shared/ui/glass-surface/](../../../shared/ui/glass-surface/) — `index.ts`, `ui/glass-surface.tsx`, `ui/glass-surface.stories.tsx`, `ui/glass-surface.test.tsx`, plus a `lib/use-liquid-press.ts` colocated for the hook (re-exported via `index.ts`).

**Public API:**

```ts
type GlassTint = "warm" | "body" | "cool" | "clear";
type GlassBlur = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type GlassElevation = 0 | 1 | 2 | 3;

type GlassSurfaceProps = {
  /** Polymorphic element. Default "div". */
  as?: "div" | "section" | "aside" | "nav" | "header" | "footer" | "button";
  /** Glass tint. Default "body". */
  tint?: GlassTint;
  /** Backdrop-blur scale rung. Default "lg". */
  blur?: GlassBlur;
  /** Adds the lens-highlight pseudo at the top edge. Default false. */
  rim?: boolean;
  /** Enables pointer-tracked specular highlight via useLiquidPress. Default false. */
  specular?: boolean;
  /** Enables the liquidPress scale + radial bloom on click/tap. Default false. */
  press?: boolean;
  /** Drop shadow rung. Default 1. */
  elevation?: GlassElevation;
  /** Forwarded className — composes after the variant classes. */
  className?: string;
  children: ReactNode;
} & ComponentPropsWithoutRef<"div">;
```

**Behaviour:**

- Polymorphic via `as`. When `as="button"`, the root renders `<button type="button">` and forwards `onClick`. All other variants accept and forward standard div attributes.
- `tint × blur × rim × specular × press × elevation` map deterministically to a className composition. There is no runtime style calculation beyond the CSS-vars written by `useLiquidPress`.
- When `specular || press` is true, internally calls `useLiquidPress(rootRef)` to wire pointer tracking and `data-active` toggling.
- When `press` is true, the root listens to `pointerdown` and applies `--animate-liquid-press` for the duration. While pressed, `data-active="true"` is on the root.
- When neither `specular` nor `press` is true, no JS listeners are attached — this remains a CSS-only component for that path (Server-Component friendly via a thin `'use client'` boundary only when needed).
- The root always emits a `data-glass="true"` attribute (E2E selector hook — consumed by Playwright in §7.3).

**Server Component split:**

- `GlassSurface` itself is a Server Component for the `specular={false} press={false}` path.
- Internally it conditionally renders an `<InteractiveGlassSurface>` client island only when `specular || press`. This keeps the SSR-only chrome cheap.

**Stories:** default (no rim, no specular), `with-rim`, `with-rim+specular`, `with-press`, all-tints (matrix), all-blurs (matrix), `as-button`. 7 stories.

**Tests:** renders root with correct className for each tint/blur, sets `data-active` on pointerdown when `press={true}`, polymorphic `as` renders the right element, falls back when reduced-transparency is set (via `matchMedia` mock).

### 2.2 `useLiquidPress(ref, options?)`

**File:** [shared/ui/glass-surface/lib/use-liquid-press.ts](../../../shared/ui/glass-surface/lib/use-liquid-press.ts)

```ts
type UseLiquidPressOptions = {
  /** If true, only updates --lx/--ly on press, not on hover. Default false. */
  pressOnly?: boolean;
  /** If true, sets data-active during the press. Default true. */
  setDataActive?: boolean;
};

type UseLiquidPressReturn = {
  pressed: boolean;
};

function useLiquidPress(
  ref: RefObject<HTMLElement>,
  options?: UseLiquidPressOptions
): UseLiquidPressReturn;
```

**Behaviour:**

- Attaches `pointermove`, `pointerdown`, `pointerup`, `pointercancel`, `pointerleave` listeners.
- On `pointermove` (when not `pressOnly`), writes `--lx` and `--ly` as percentages relative to the element's bounding rect.
- On `pointerdown`, sets `data-active="true"` (when `setDataActive`), updates `--lx/--ly` to the tap point, returns `pressed: true`.
- On `pointerup` / `pointercancel` / `pointerleave`, clears `data-active`, returns `pressed: false`.
- Reads `matchMedia('(prefers-reduced-motion: reduce)')` once on mount; if reduced, becomes a no-op.
- Cleans up all listeners on unmount.

**Tests:** updates CSS vars on pointermove, sets data-active on pointerdown, clears on pointerup, no-op when reduced-motion is set, cleans up listeners.

---

## 3 · Primitive upgrades

For each existing primitive listed below, the upgrade contract is:

- Existing public API is preserved.
- Visual default may change (in Storybook, in production usage).
- A `legacy` boolean prop is **not** added — we are not building back-compat shims.
- Storybook gains new "glass" story variants; existing stories are retained for regression visibility.

### 3.1 `<Sheet />` ([shared/ui/sheet/](../../../shared/ui/sheet/))

- Body is internally re-rendered as `<GlassSurface tint="warm" blur="2xl" rim specular elevation={3}>`.
- Drag-to-dismiss switches to `motion`'s spring driven by `--spring-soft`.
- Existing props (`snapPoints`, `defaultSnap`, `open`, `onOpenChange`) unchanged.
- Scrim still uses `var(--color-scrim)` + `var(--backdrop-blur-md)` (already wired).
- New story: `glass-sheet-default`, `glass-sheet-multi-snap`. Existing stories retained.

### 3.2 `<Toast />` ([shared/ui/toast/](../../../shared/ui/toast/))

- Card body becomes `<GlassSurface tint="warm" blur="lg" rim elevation={2}>`.
- Swipe-to-dismiss uses Motion's `dragElastic: 0.2`, `dragConstraints: { left: 0 }`, dismisses past 60% velocity.
- Status-dot (`--color-status-*`) and gilded hairline retained.
- Existing `useToast()` hook unchanged.

### 3.3 `<Button />` ([shared/ui/button/](../../../shared/ui/button/))

- New variant: `variant="glass"`. Existing variants (`primary`, `ghost`, etc.) are not changed.
- Glass variant internally renders `<GlassSurface as="button" tint="warm" blur="md" press elevation={1}>` with the existing label and icon slots inside.
- Press effect uses `useLiquidPress` with `pressOnly: false` (specular tracks hover too).

### 3.4 `<SpotlightCard />` ([shared/ui/spotlight-card/](../../../shared/ui/spotlight-card/))

- New variant: `variant="glass"`. Existing `variant="solid"` (the current default) is not changed and remains the default for backwards compatibility.
- Glass variant composes the existing pointer-tracking spotlight (writes `--mx/--my`) **plus** a `GlassSurface` body wrapping the content. The spotlight gradient and the glass specular highlight coexist — they live on different pseudo-elements (spotlight on `::after` of `.spotlight`, specular on `::after` of `.glass-specular`). Both pseudo selectors are deliberately on different elements so there's no clash.

### 3.5 `<PressableSurface />` ([shared/ui/pressable-surface/](../../../shared/ui/pressable-surface/))

- Adds a new prop: `liquid?: boolean` (default `true`).
- When `liquid: true`, the surface attaches `useLiquidPress(ref, { pressOnly: true })` and uses `.glass-specular` styling for the press radial — combined with the existing ripple. The ripple stays the primary touch confirmation; the liquid highlight is the secondary "surface tension" affordance.
- When `liquid: false`, behaviour is unchanged from today.
- **Stacking-context audit required during implementation:** both `.ripple-host` (existing) and `.glass-specular` (new) rely on `isolation: isolate` plus pseudo-elements with `border-radius: inherit` for the rendered overlay. When both classes coexist on the same root, verify the ripple `::before`/elements and the specular `::after` paint in the intended order (specular below ripple — the ripple is the louder confirmation). If the stack ends up reversed, the fix is to give specular `z-index: 0` and ripple `z-index: 1` explicitly on the shared host.

### 3.6 `<FloatingInput />` ([shared/ui/floating-input/](../../../shared/ui/floating-input/))

- Container wraps input in `<GlassSurface tint="body" blur="md" rim elevation={1}>` by default — the rim pseudo-element is **always rendered** (its `::before` exists in the DOM at mount); only the rim's `opacity` is transitioned. Default rim opacity is `0` (invisible).
- On focus, the wrapper transitions `tint` from `body` to `warm` (via `background-color` 240ms ease-out) and rim `opacity` from `0` to `1` (240ms ease-out). The `::before` does not get added or removed — only its opacity changes — so the transition runs cleanly.
- Label float behaviour unchanged.

---

## 4 · Widget chrome migrations

The five chrome widgets that frame every route. After this section lands, every screen in the app feels "different" without view-content code being touched.

### 4.1 `<AppHeader />` ([widgets/app-header/](../../../widgets/app-header/))

- Root renders `<GlassSurface as="header" tint="warm" blur="xl" rim={false} elevation={2}>` sticky to the top with `position: sticky; top: 0; z-index: 50`.
- Bottom edge keeps the existing gilded hairline (`border-image` 1px gold gradient).
- Locale + theme + palette switchers float inside; they retain their own button styling.

### 4.2 `<TabBar />` ([widgets/tab-bar/](../../../widgets/tab-bar/))

- Floats: `position: fixed; left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom));`
- Renders `<GlassSurface tint="warm" blur="2xl" rim specular elevation={3}>` as the dock body.
- Each tab is a `<GlassSurface as="button" tint="clear" blur="xs" press elevation={0}>` inside the dock.
- The active tab gets a single-pass `--animate-rim-sweep` on route change (driven by `usePathname` from `i18n/navigation`). Mechanism: the active tab's root element receives `data-active="true"`; a CSS rule `[data-glass="true"][data-active="true"] { animation: var(--animate-rim-sweep); }` scoped to the tab-bar binds the keyframe. The animation runs once on data-attribute change because the keyframe re-attaches on selector match transitions.

### 4.3 `<NavSheet />` ([widgets/nav-sheet/](../../../widgets/nav-sheet/))

- Refactored to compose the upgraded `<Sheet />` directly. No widget-local glass logic.
- Existing nav-link list is unchanged; only the sheet body becomes glass.

### 4.4 `<BookingStepper />` ([widgets/booking-stepper/](../../../widgets/booking-stepper/))

- Outer chrome becomes `<GlassSurface tint="cool" blur="md" elevation={1}>`.
- Segment bars stay gold-gradient when filled, gilded hairline when empty.
- If the `scaleX(0 → 1)` motion prescribed in Phase 1 isn't implemented yet, verify and add it here (using `motion.div` with `style={{ scaleX }}` and `transform-origin: left`).

### 4.5 `<TonightStrip />` ([widgets/tonight-strip/](../../../widgets/tonight-strip/))

- Outer ribbon becomes `<GlassSurface tint="warm" blur="md" elevation={1}>`.
- Existing `<Marquee />` inside is unchanged.
- Spec-out: the ribbon's "tap a slot" interaction stays whatever it is today; this migration does not touch behaviour.

---

## 5 · Fallbacks

### 5.1 Reduced-transparency

`@media (prefers-reduced-transparency: reduce)` — already covered in §1.6. Solid `var(--color-surface)` background replaces every glass tint; backdrop-filter is removed; the rim and specular pseudo-elements are hidden. The lens-rim and specular are the "polish layer" — the underlying surface is fully legible without them.

### 5.2 Reduced-motion

`@media (prefers-reduced-motion: reduce)` — the global block at the bottom of [app/globals.css](../../../app/globals.css) already zeroes all animation durations. The §1.6 block additionally disables the continuous `glassShimmer`. `useLiquidPress` short-circuits when reduced-motion is set, so no `--lx/--ly` writes happen — the specular pseudo simply stays at its default `50% 0%`.

### 5.3 Palette compatibility

Glass tints use the existing palette `--color-text` family via fixed alphas, so they remain palette-agnostic. Visual QA per palette is deferred to a follow-on spec (out of scope per §0); for this spec, we visually verify in the default Aubergine palette and smoke-test in Mono + Obsidian (the two most distant palette extremes from Aubergine).

### 5.4 Browser compatibility

`backdrop-filter` is supported in all current browsers. Safari requires `-webkit-backdrop-filter`; all utility classes emit both. The fallback for `prefers-reduced-transparency: reduce` doubles as the fallback for any future browser that does not support backdrop-filter.

---

## 6 · Performance

### 6.1 Budget

Lighthouse mobile remains ≥ 92 (project floor). Specific guardrails added by this spec:

- **Max two concurrent `blur-xl` or `blur-2xl` surfaces visible** at any time. Documented in the GlassSurface JSDoc and called out in the PR description. Not enforced by code.
- **Backdrop-filter cost** is highest on first paint with a heavy surface above-the-fold. The TabBar (a `blur-2xl` always-visible surface) is the single biggest cost; the AppHeader (`blur-xl`) is the second. Bookings/sheets are intermittent.
- **GPU layer count**: each glass surface is its own compositor layer. The chrome (header + tab-bar) sits on two layers always; sheets/toasts add up to two more transient layers. Cards and tiles do not get `blur` rungs above `lg` to keep their layer cost ignorable.

### 6.2 Measurement

Before-and-after Lighthouse runs on `/welcome`, `/home`, `/services/[slug]`, `/booking/when` recorded in the PR description. We don't ship if LCP regresses by more than 100 ms on any of those four routes on a mid-range Android profile.

---

## 7 · Testing

### 7.1 Vitest (per new and upgraded primitive)

Each `shared/ui/*` slice already has a `*.test.tsx`. We add or extend:

- **glass-surface**: renders, polymorphic `as`, className composition for tint/blur/rim/specular/press, `useLiquidPress` integration (mount/unmount listener counts), reduced-transparency fallback (via `matchMedia` mock).
- **sheet**: existing tests pass; new test that the body has the expected glass classes; spring drag dismisses on velocity threshold.
- **toast**: existing tests pass; swipe-to-dismiss test.
- **button**: existing variants render unchanged; new `variant="glass"` renders a `<GlassSurface as="button">`.
- **spotlight-card**: existing `variant="solid"` unchanged; new `variant="glass"` renders correct compositional classes.
- **pressable-surface**: existing ripple unchanged; `liquid: true` (default) wires the specular listeners; `liquid: false` does not.
- **floating-input**: focus transitions tint warm and adds rim.

### 7.2 Storybook

Each upgraded primitive gains at least one "with glass" story alongside existing stories. `glass-surface` has 7 stories (see §2.1). Storybook a11y addon must pass zero violations on every new story (existing CI rule).

The two Vitest projects defined in [vitest.config.ts](../../../vitest.config.ts) (jsdom default + Storybook browser via `@storybook/addon-vitest`) both run all stories. New stories therefore become tests automatically.

### 7.3 Playwright (E2E)

Two new specs:

- **liquid-glass-chrome.spec.ts** — visit `/`, assert the app header and tab bar render with `data-testid` selectors carrying `data-glass="true"` (a small data attribute we add to GlassSurface for E2E hooks). Capture a screenshot on Aubergine, Mono, Obsidian palettes via `data-palette` toggle.
- **sheet-glass.spec.ts** — open the nav-sheet from `/home`, assert glass body is present, drag-to-dismiss works.

No view-level E2E (those would be in follow-on view migration specs).

---

## 8 · Ship strategy

### 8.1 Branch & PR

- Single feature branch: `feature/liquid-glass-foundation` off `develop`.
- Single PR targeting `develop` (per repo memory note).
- Husky `pre-commit` (lint + test) and `pre-push` (build) gates apply.

### 8.2 Commit sequence (within the single PR — for bisect)

Commits ordered so `git bisect` lands meaningfully if a regression slips through:

1. `feat(globals): liquid-glass tokens + utilities + keyframes` — §1 only. Pure CSS, no consumers yet.
2. `feat(shared/ui): GlassSurface + useLiquidPress` — §2 only. New slice; no existing component changed.
3. `feat(shared/ui/sheet): glass body` — §3.1.
4. `feat(shared/ui/toast): glass body + swipe-dismiss` — §3.2.
5. `feat(shared/ui/button): glass variant` — §3.3.
6. `feat(shared/ui/spotlight-card): glass variant` — §3.4.
7. `feat(shared/ui/pressable-surface): liquid press` — §3.5.
8. `feat(shared/ui/floating-input): glass body + focus-lit rim` — §3.6.
9. `feat(widgets/app-header): glass sticky chrome` — §4.1.
10. `feat(widgets/tab-bar): glass floating dock` — §4.2.
11. `feat(widgets/nav-sheet): compose upgraded sheet` — §4.3.
12. `feat(widgets/booking-stepper): glass chrome` — §4.4.
13. `feat(widgets/tonight-strip): glass ribbon` — §4.5.
14. `test(liquid-glass): E2E specs` — §7.3.
15. `docs(liquid-glass): PR notes + Lighthouse before/after` — §6.2 measurements.

### 8.3 Backwards compatibility

- No `legacy` props. No deprecation shims. No renamed APIs.
- The only changing visual default is on `<Sheet />` and `<Toast />`, which today are minimal-use surfaces — the consumers that exist will get the new look without code changes.
- `<Button />`, `<SpotlightCard />`, `<PressableSurface />`, `<FloatingInput />` only add new options; their current default rendering is unchanged.
- Widget chrome (`<AppHeader />`, `<TabBar />`, `<NavSheet />`, `<BookingStepper />`, `<TonightStrip />`) changes its rendered output but its public consumer API is unchanged.

---

## 9 · Out of scope (deferred to follow-on specs)

- **View-level migrations**: `/home`, `/welcome`, `/services/[slug]`, `/booking/*`, `/profile`, `/gallery`, `/admin/*`. Each view will get its own spec consuming this foundation.
- **Per-palette tint tuning**: the spec-as-shipped uses palette-agnostic alphas. If a specific palette (e.g. `mono`, `obsidian`) reads "off" in a future palette-tuning pass, that's a separate spec.
- **Real performance instrumentation**: the §6.2 budget is enforced by manual Lighthouse runs. A future spec may add automated Lighthouse-CI gating into the PR workflow.
- **Native iOS/Android-style "rubber band" overscroll** on sheets — would be a Sheet-only improvement, deferred.
- **Cathedral-style iridescent palette glass** (option C from brainstorming) — explicitly out.
- **Editor / admin route chrome** — admin views have their own chrome conventions; touching them is a different spec.
- **A11y high-contrast tuning for glass** — the `prefers-reduced-transparency` fallback covers the safety case; an explicit `prefers-contrast: more` glass variant is deferred.

---

## 10 · Acceptance

This spec ships when:

1. All 15 commits in §8.2 land on `feature/liquid-glass-foundation` with green CI (lint + Vitest + Storybook a11y + Playwright + Lighthouse mobile ≥ 92).
2. The PR description includes before-and-after Lighthouse numbers on the four routes named in §6.2, with no route regressing LCP by more than 100ms.
3. Visual smoke on Aubergine, Mono, and Obsidian palettes shows no contrast failures (manual review with screenshots in the PR description).
4. `prefers-reduced-transparency` and `prefers-reduced-motion` modes are verified manually with macOS / iOS device settings; screenshots in PR.
5. The TabBar, AppHeader, NavSheet, BookingStepper, and TonightStrip all visibly use glass on every route — confirmed via a sweep on the dev server.

— end of design —
