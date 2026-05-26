# FlameMonogram — V made of fire

**Status:** Design (approved by user, pending spec review)
**Date:** 2026-05-27
**Component:** `shared/ui/flame-monogram`
**Call sites:** [views/home/ui/sections/home-hero.tsx](../../../views/home/ui/sections/home-hero.tsx), [views/welcome/ui/welcome-page.tsx](../../../views/welcome/ui/welcome-page.tsx)

## Goal

Rework the existing `FlameMonogram` so the V *is* the fire (the glyph itself made of flame), instead of a 3D metallic letter standing in front of a soft amber flame body. Slow Y-axis rotation is retained — the V should read as a glowing ember log spinning slowly.

Reference: a fiery letter "I" on near-black — white-hot base, yellow/orange shaft, hard sparks escaping upward.

Current behavior to preserve:
- Component public API (`letter`, `className`, `rotationDuration`, `emberCount`).
- 3D Y-axis rotation (default 24s).
- `useReducedMotion` gating (skip animations under reduced motion).
- SSR-safe deterministic pseudorandom (`Math.imul` mix already in [flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx)).
- `aria-hidden` / `role="presentation"` — pure decoration.

## Visual spec

### Front face of the V

- No more gold/bronze metallic look. Front face uses a vertical fire gradient applied via `background-image` + `background-clip: text`:
  - `0%` (V's base): `#fff5d6` — white-hot
  - `30%`: `#ffd28a`
  - `60%`: `#e8a04a`
  - `100%` (V's tips): `#c9572a`
- Front face receives a lightweight CSS `filter: url(#fm-displace)` (a new, separate displacement filter — *not* the goo metaball) so the fire texture on the glyph shimmers and ripples.
- Drop shadow goes red-tinted: `drop-shadow(0 2px 6px rgba(120, 30, 10, 0.7))` plus `drop-shadow(0 0 22px rgba(255, 180, 90, 0.6))`. No black shadow — the V is no longer a metal object casting darkness.

### Extrusion layers (visible during rotation)

Palette flips from bronze to ember. The `lerp(58→160, 42→130, 18→78)` becomes:
- Backmost layer: `rgb(40, 8, 0)` — black-cherry, almost the page color
- Mid: `rgb(140, 30, 0)` — ember red
- Front-adjacent: `rgb(255, 140, 40)` — bright orange
- Front face itself: overridden by the fire-gradient text (not a flat color).

The lerp ramps **non-linearly** (apply `t * t` instead of `t`) so the front 3–4 layers cluster bright orange while the back fades quickly to black — produces a hotter front cap and a darker tail when rotating.

### Atmosphere

- Existing amber halo (radial gradient `div`) becomes **tighter and hotter**:
  - `radial-gradient(ellipse 40% 55% at 50% 60%, rgba(255, 220, 140, 0.45), rgba(220, 90, 40, 0.22) 40%, transparent 75%)`
  - Smaller radius, white-yellow core, no pinkish mid-stop.
- New **smoke wisp**: 2–3 vertical SVG paths with low-opacity dark gray fill, slowly translated upward via `<animate>`, masked at the bottom so they appear to emerge from the V's tips. Skipped under `useReducedMotion`.

### Sparks

- `SPARK_COUNT` 18 → 36.
- Larger size range (`1.4 + r * 3.4` instead of `1.4 + r * 2.6`).
- Brighter cores: 60% of sparks use `#fff5d6` (was 33%).
- Longer drift duration so they trail further upward before fading (`2.0 + r * 1.4` instead of `1.6 + r * 1.2`).
- Existing `--sparkDriftX` CSS var pattern unchanged.

### Motion

- Y-axis rotation: unchanged (24s default).
- Existing flame-body metaball animation: unchanged.
- New: front-face displacement filter animates `baseFrequency` like the goo filter does, so the V's fire texture is alive.
- All new animation paths gated on `useReducedMotion`.

## Implementation strategy

**Single file edited:** [shared/ui/flame-monogram/ui/flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx). No new files, no new components, no new exports.

### Concrete changes

1. **Add a second SVG filter** in `<defs>`: `#fm-displace` — `feTurbulence` + `feDisplacementMap` with a smaller `scale` (~4) than the goo filter (14), targeting `SourceGraphic`. Reduced-motion: render the `<filter>` but skip the `<animate>` so it becomes static.

2. **Front-face span:** swap `text-gold-shimmer` Tailwind utility for inline style:
   ```tsx
   style={{
     backgroundImage: "linear-gradient(180deg, #fff5d6 0%, #ffd28a 30%, #e8a04a 60%, #c9572a 100%)",
     WebkitBackgroundClip: "text",
     backgroundClip: "text",
     color: "transparent",
     filter: "url(#fm-displace) drop-shadow(0 2px 6px rgba(120,30,10,0.7)) drop-shadow(0 0 22px rgba(255,180,90,0.6))",
   }}
   ```

3. **Extrusion shading:** replace the existing `lerp` block:
   ```ts
   const t = i / (LETTER_DEPTH - 1);
   const tt = t * t; // hotter front, darker tail
   const lerp = (a: number, b: number) => Math.round(a + (b - a) * tt);
   const shade = `rgb(${lerp(40, 255)}, ${lerp(8, 140)}, ${lerp(0, 40)})`;
   ```

4. **Sparks:** bump `SPARK_COUNT` to 36; tweak `buildSparks` size/duration ranges and the `fill` ternary in render (`i % 3 === 0` → `i % 5 < 3` for the bright-core ratio).

5. **Halo `div`:** replace the inline `background` radial-gradient string with the tighter values above.

6. **Smoke wisp:** add a new `<g>` inside the main `<svg>` (above the existing sparks block), holding 2–3 `<path>` smudges. Each path uses `<animateTransform attributeName="transform" type="translate" .../>` to drift upward (SMIL requires `animateTransform`, not `animate`, for transform attrs) and `<animate attributeName="opacity" .../>` to fade. Conditional on `!reduceMotion`.

### No API changes

`FlameMonogramProps` stays the same. Both call sites continue to work without edit.

## Accessibility & performance

- `aria-hidden` / `role="presentation"`: unchanged.
- `useReducedMotion` gates: spark animation, smoke wisp animation, displacement filter `<animate>` (filter is still applied statically — graceful degradation).
- DOM cost delta: +18 spark circles, +2–3 smoke paths, +1 SVG filter. ~22 extra nodes. Same order of magnitude as today.
- Component is rendered only on `/` (home hero) and `/welcome` — both above the fold, but only one instance per page.

## Testing

- Existing Vitest test in [shared/ui/flame-monogram/ui/flame-monogram.test.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.test.tsx) (renders, `data-testid="flame-monogram"`, contains the letter character) must continue to pass.
- Existing Storybook story in [shared/ui/flame-monogram/ui/flame-monogram.stories.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.stories.tsx) is the manual visual regression. The Vitest `storybook` project will render it automatically; visual check happens in Storybook (`npm run storybook`).
- No new e2e — pure decorative, zero interaction.
- No new unit tests required — visual change only, no new branches in the API surface.

## Out of scope

- Rotation cadence change (stays 24s).
- Welcome / home hero page background changes.
- Changes to [MonogramSeal](../../../shared/ui/monogram-seal/ui/monogram-seal.tsx) or [Wordmark](../../../shared/ui/wordmark/ui/wordmark.tsx).
- New configuration props (e.g. `palette`, `intensity`) — YAGNI; if a second variant is needed later, add then.
- Audio / haptics.

## Open questions

None at design time. If the hot-orange front cap reads as too aggressive in Storybook against the deep-purple welcome page, we'll widen the lerp ramp (`tt` → `t * t * 0.8 + t * 0.2`) during implementation — a tuning detail, not a design change.
