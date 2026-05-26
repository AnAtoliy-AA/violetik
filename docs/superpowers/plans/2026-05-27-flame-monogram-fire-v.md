# FlameMonogram fire-V implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [docs/superpowers/specs/2026-05-27-flame-monogram-fire-v-design.md](../specs/2026-05-27-flame-monogram-fire-v-design.md)

**Goal:** Rework `shared/ui/flame-monogram` so the V *is* the fire (white-hot base, ember-red back layers, displaced fire-texture on the front face), with brighter sparks, a tighter hot halo, and a smoke wisp — while keeping the slow Y-axis rotation, public API, and existing tests.

**Architecture:** Single-file rework of `shared/ui/flame-monogram/ui/flame-monogram.tsx`. Adds a second SVG filter (displacement-only, no metaball goo) applied to the front-face HTML text via CSS `filter: url(#fm-displace)`. Flips the extrusion shading palette to embers, swaps the front-face `text-gold-shimmer` class for inline fire-gradient `background-clip: text`. Sparks +18, smoke wisp via SMIL `<animateTransform>`. No new files, no API changes.

**Tech stack:** React 19, TypeScript strict, `motion/react`, SVG (turbulence + displacement + goo metaball), Tailwind v4, Vitest + Testing Library, Storybook (`@storybook/nextjs-vite`).

**Working tree:** This plan executes inside the worktree at `.claude/worktrees/flame-monogram-fire-v` on branch `feature/flame-monogram-fire-v` (off `origin/develop`).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| [shared/ui/flame-monogram/ui/flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx) | Modify | The component itself — all visual changes |
| [shared/ui/flame-monogram/ui/flame-monogram.test.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.test.tsx) | Modify | Add structural tests for new SVG nodes; keep all existing assertions |
| [shared/ui/flame-monogram/ui/flame-monogram.stories.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.stories.tsx) | Modify | Update the autodocs description to match the new look |
| `app/globals.css` | **Untouched** | The `flameRise` / `sparkRise` keyframes and the `text-gold-shimmer` utility stay (other components — Wordmark — still use them) |

No new files. No new exports. `FlameMonogramProps` unchanged.

---

## Pre-flight (one-time, before Task 1)

- [ ] **Verify clean test baseline in this worktree**

```bash
cd /Users/anatoliyaliaksandrau/js/violetik/.claude/worktrees/flame-monogram-fire-v
npm install
npm test -- --run shared/ui/flame-monogram
```

Expected: 5 tests pass in [flame-monogram.test.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.test.tsx). If the broader `npm test` is run, all should pass (worktree is `origin/develop` head).

If anything fails: stop and investigate. Don't proceed.

---

## Task 1: New `fm-displace` SVG filter (no behavior visible yet — gates Task 2)

**Files:**
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.tsx` — add filter inside `<defs>` (next to existing `fm-goo`)
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.test.tsx` — add test for filter presence

- [ ] **Step 1: Write the failing test**

Append to [shared/ui/flame-monogram/ui/flame-monogram.test.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.test.tsx) inside the existing `describe`:

```tsx
it("defines a separate displacement filter for the front-face glyph", () => {
  const { container } = render(<FlameMonogram />);
  const displace = container.querySelector("filter#fm-displace");
  expect(displace).not.toBeNull();
  expect(displace?.querySelector("feTurbulence")).not.toBeNull();
  expect(displace?.querySelector("feDisplacementMap")).not.toBeNull();
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx -t "displacement filter"
```

Expected: FAIL — `filter#fm-displace` is `null`.

- [ ] **Step 3: Add the filter to `<defs>`**

Inside `<defs>` in [flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx), directly after the closing tag of the existing `<filter id="fm-goo">`, add:

```tsx
<filter id="fm-displace" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence
    type="fractalNoise"
    baseFrequency="0.025 0.06"
    numOctaves="2"
    seed="7"
    result="dispNoise"
  >
    {reduceMotion ? null : (
      <animate
        attributeName="baseFrequency"
        dur="5s"
        values="0.025 0.06;0.04 0.08;0.02 0.07;0.035 0.065;0.025 0.06"
        repeatCount="indefinite"
      />
    )}
  </feTurbulence>
  <feDisplacementMap
    in="SourceGraphic"
    in2="dispNoise"
    scale={reduceMotion ? "1.5" : "4"}
  />
</filter>
```

Note: the filter is *defined* even under reduced motion (just static). Only the `<animate>` is gated. `scale` is reduced (4 → 1.5) under reduced motion so the displaced glyph remains readable.

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx
```

Expected: 6 passing (the new test plus the 5 existing).

- [ ] **Step 5: Commit**

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.tsx shared/ui/flame-monogram/ui/flame-monogram.test.tsx
git commit -m "feat(flame-monogram): add fm-displace SVG filter for the front-face glyph"
```

---

## Task 2: Front face — fire gradient + displacement filter (replaces metallic gold)

**Files:**
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.tsx` — replace the front face's `text-gold-shimmer` class + drop-shadow with inline fire styles
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.test.tsx` — add test for the inline style attrs

- [ ] **Step 1: Write the failing test**

Append:

```tsx
it("renders the front-face glyph with a fire-gradient text and the displace filter", () => {
  const { container } = render(<FlameMonogram />);
  // Front face is the last span (highest z) inside the .grid wrapper.
  const spans = container.querySelectorAll<HTMLElement>("div.grid > span");
  const front = spans[spans.length - 1];
  expect(front).toBeDefined();
  // Inline style replaces the text-gold-shimmer class.
  expect(front.style.color).toBe("transparent");
  expect(front.style.backgroundImage).toContain("linear-gradient");
  expect(front.style.filter).toContain("url(#fm-displace)");
  expect(front.className).not.toMatch(/text-gold-shimmer/);
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx -t "fire-gradient text"
```

Expected: FAIL — `front.style.color` is `""` and the class still has `text-gold-shimmer`.

- [ ] **Step 3: Update the front-face span**

In [flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx) at the `<span>` inside the `LETTER_DEPTH` map, replace **three** things on the front-face render:
1. The className conditional `isFront && "text-gold-shimmer"` — gone (class string is now static).
2. The `color: isFront ? undefined : shade` style line — now `color: isFront ? "transparent" : shade` (front face is transparent so the gradient fill shows through `background-clip: text`).
3. The conditional `filter: isFront ? "drop-shadow(...) drop-shadow(...)" : undefined` — now adds `url(#fm-displace)` plus red-tinted drop-shadows.

The full updated `<span>` block:

```tsx
return (
  <span
    key={i}
    className="font-display text-[180px] font-light italic leading-none"
    style={{
      gridArea: "1 / 1",
      transform: `translateZ(${z}px)`,
      color: isFront ? "transparent" : shade,
      backgroundImage: isFront
        ? "linear-gradient(180deg, #fff5d6 0%, #ffd28a 30%, #e8a04a 60%, #c9572a 100%)"
        : undefined,
      WebkitBackgroundClip: isFront ? "text" : undefined,
      backgroundClip: isFront ? "text" : undefined,
      filter: isFront
        ? "url(#fm-displace) drop-shadow(0 2px 6px rgba(120,30,10,0.7)) drop-shadow(0 0 22px rgba(255,180,90,0.6))"
        : undefined,
    }}
  >
    {letter}
  </span>
);
```

(The `cn(...)` wrapper is dropped since the class string is now static — no conditional pieces remain. The `cn` import on the file stays in use elsewhere in the component, so no import edit is needed.)

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx
```

Expected: all tests pass. Existing `getAllByText("V")` still finds 22 Vs (extrusion layers preserved).

- [ ] **Step 5: Commit**

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.tsx shared/ui/flame-monogram/ui/flame-monogram.test.tsx
git commit -m "feat(flame-monogram): front-face V uses fire-gradient text + displacement"
```

---

## Task 3: Extrusion shading — bronze → ember with non-linear ramp

**Files:**
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.tsx` — replace the `lerp` palette
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.test.tsx` — add test asserting back layers use ember tones

- [ ] **Step 1: Write the failing test**

```tsx
it("shades extrusion back layers with ember tones, not bronze", () => {
  const { container } = render(<FlameMonogram />);
  const spans = container.querySelectorAll<HTMLElement>("div.grid > span");
  // Back layer (i=0): color should be near-black-cherry, not bronze.
  // Bronze was rgb(58, 42, 18); ember target is rgb(40, 8, 0).
  const back = spans[0];
  expect(back.style.color).toBe("rgb(40, 8, 0)");
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx -t "ember tones"
```

Expected: FAIL — back layer color is `rgb(58, 42, 18)`.

- [ ] **Step 3: Update the shading lerp**

In [flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx), inside the `Array.from({ length: LETTER_DEPTH })` map, replace:

```tsx
const t = i / (LETTER_DEPTH - 1);
const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
const shade = `rgb(${lerp(58, 160)}, ${lerp(42, 130)}, ${lerp(18, 78)})`;
```

…with the ember palette and non-linear ramp:

```tsx
const t = i / (LETTER_DEPTH - 1);
const tt = t * t; // hotter front, darker tail — most depth fades quickly to black-cherry.
const lerp = (a: number, b: number) => Math.round(a + (b - a) * tt);
const shade = `rgb(${lerp(40, 255)}, ${lerp(8, 140)}, ${lerp(0, 40)})`;
```

(Front face color is overridden to `transparent` from Task 2; this `shade` only affects back layers.)

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.tsx shared/ui/flame-monogram/ui/flame-monogram.test.tsx
git commit -m "feat(flame-monogram): ember shading for extrusion back layers"
```

---

## Task 4: Sparks — count, palette, drift

**Files:**
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.tsx` — `SPARK_COUNT`, `buildSparks` params, fill ternary
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.test.tsx` — assert new spark count

- [ ] **Step 1: Write the failing test**

```tsx
it("renders 36 free sparks (siblings of the masked rect)", () => {
  const { container } = render(<FlameMonogram />);
  // Free sparks are <circle>s that are direct children of <svg>, not inside <mask>.
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  const freeCircles = Array.from(svg!.children).filter(
    (el) => el.tagName.toLowerCase() === "circle",
  );
  expect(freeCircles).toHaveLength(36);
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx -t "36 free sparks"
```

Expected: FAIL — currently 18 sparks.

- [ ] **Step 3: Update spark constants and palette**

In [flame-monogram.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.tsx):

1. Change `const SPARK_COUNT = 18;` → `const SPARK_COUNT = 36;`

2. In `buildSparks`, replace the body's `size` and `duration` expressions:
   - `size: 1.4 + pseudo(i + 1000, 1) * 2.6,` → `size: 1.4 + pseudo(i + 1000, 1) * 3.4,`
   - `duration: 1.6 + pseudo(i + 1000, 4) * 1.2,` → `duration: 2.0 + pseudo(i + 1000, 4) * 1.4,`

3. In the spark render, change the fill ternary:
   - `fill={i % 3 === 0 ? "#fff5d6" : "#ffd28a"}` → `fill={i % 5 < 3 ? "#fff5d6" : "#ffd28a"}` (60% bright cores)

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.tsx shared/ui/flame-monogram/ui/flame-monogram.test.tsx
git commit -m "feat(flame-monogram): 36 brighter sparks with longer drift"
```

---

## Task 5: Tighten halo + add smoke wisp

**Files:**
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.tsx` — replace halo gradient inline `background`; add `<g data-testid="fm-smoke">` with 3 smoke paths
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.test.tsx` — assert smoke `<g>` and 3 paths

- [ ] **Step 1: Write the failing test**

```tsx
it("renders a smoke wisp with three drifting paths above the V", () => {
  const { container } = render(<FlameMonogram />);
  const smoke = container.querySelector("[data-testid='fm-smoke']");
  expect(smoke).not.toBeNull();
  expect(smoke!.querySelectorAll("path")).toHaveLength(3);
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx -t "smoke wisp"
```

Expected: FAIL — no smoke node.

- [ ] **Step 3: Tighten halo + add smoke wisp**

3a. Replace the existing halo radial gradient in the bottom `<div className="pointer-events-none absolute inset-0" ...>`:

```tsx
<div
  className="pointer-events-none absolute inset-0"
  style={{
    background:
      "radial-gradient(ellipse 40% 55% at 50% 60%, rgba(255, 220, 140, 0.45), rgba(220, 90, 40, 0.22) 40%, transparent 75%)",
  }}
/>
```

3b. Inside the main `<svg>` (above the free-sparks block, after the white-hot ellipse), add:

```tsx
{/* Smoke wisp — three vertical smudges drifting upward from the V's tips.
  * SMIL animateTransform (not animate) is required for transform attribute
  * animation. Static under reduced motion. */}
<g data-testid="fm-smoke">
  {[
    { d: "M 92 70 Q 88 50 96 30 Q 102 14 98 -2", delay: "0s",   dur: "6s" },
    { d: "M 100 64 Q 104 44 100 26 Q 96 10 104 -4", delay: "-2s", dur: "7s" },
    { d: "M 110 72 Q 116 52 108 32 Q 104 16 112 0",  delay: "-4s", dur: "8s" },
  ].map((s, i) => (
    <path
      key={i}
      d={s.d}
      fill="none"
      stroke="rgba(40,30,40,0.32)"
      strokeWidth="14"
      strokeLinecap="round"
      style={{ filter: "blur(6px)" }}
      opacity="0"
    >
      {reduceMotion ? null : (
        <>
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to="0 -120"
            dur={s.dur}
            begin={s.delay}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;0.5;0.5;0"
            keyTimes="0;0.2;0.7;1"
            dur={s.dur}
            begin={s.delay}
            repeatCount="indefinite"
          />
        </>
      )}
    </path>
  ))}
</g>
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run shared/ui/flame-monogram/ui/flame-monogram.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.tsx shared/ui/flame-monogram/ui/flame-monogram.test.tsx
git commit -m "feat(flame-monogram): tighter hot halo + smoke wisp above the V"
```

---

## Task 6: Update Storybook description

**Files:**
- Modify: `shared/ui/flame-monogram/ui/flame-monogram.stories.tsx` — update the autodocs description

No new test — this is doc content.

- [ ] **Step 1: Edit the description**

In [flame-monogram.stories.tsx](../../../shared/ui/flame-monogram/ui/flame-monogram.stories.tsx), replace the `description.component` string with:

```ts
"Rotating monogram letter rendered as fire: the glyph is filled with a vertical fire gradient (white-hot at the base, ember-orange at the tips) displaced by SVG turbulence, while extruded back layers fade from bright orange to black-cherry. A flame body wraps the V via a metaball mask, with 36 free sparks and a three-strand smoke wisp drifting upward. Honors prefers-reduced-motion."
```

- [ ] **Step 2: Commit**

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.stories.tsx
git commit -m "docs(flame-monogram): update story description for the fire-V rework"
```

---

## Task 7: Verification — manual visual check + final lint/test/build

**This task is the gating verification before claiming the work done. Use [`@superpowers:verification-before-completion`](../../../.claude/skills) — run real commands and read real output, don't assert success without evidence.**

- [ ] **Step 1: Full Vitest run**

```bash
npm test -- --run
```

Expected: all suites pass — both the default jsdom project and the `storybook` project (which runs every story as a test through Playwright Chromium via `@storybook/addon-vitest`, per [CLAUDE.md](../../../CLAUDE.md)).

If the `storybook` Vitest project fails on the FlameMonogram stories, the failure mode is *real-browser*, not JSDOM — Chromium supports SVG filters fully, so any failure there is a real bug (likely a malformed filter ref or an unattached `<g>`). Read the failure message and fix the source, not the story. Skipping the test is a last resort.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: zero errors. If the inline-style block in Task 2 produces React style-prop warnings, fix them (typo, wrong casing).

- [ ] **Step 3: Manual Storybook visual review**

```bash
npm run storybook
```

Open http://localhost:6006 → `shared/ui/FlameMonogram` → `Default`.

Verify visually:

- [ ] Front face of the V is filled with fire colors (white-hot base, orange tips), NOT gold/metallic.
- [ ] The V's "thickness" visible during rotation reads as embers — bright orange front cap, fades to dark cherry at the back.
- [ ] Sparks are denser and brighter than before; they trail noticeably above the V.
- [ ] A faint smoke wisp drifts up from above the V's tips and fades out.
- [ ] The amber halo is tighter — concentrated under/around the V, not a wide diffuse glow.
- [ ] Reduced motion (toggle OS or use Storybook's a11y addon): rotation, displacement animation, spark animation, smoke animation all stop; the static frame is still legible (V is still fire-colored, halo is still warm).

If any of those fail subjectively, note which and apply the tuning fallback from the spec's "Open questions" — widen the ramp `tt → t * t * 0.8 + t * 0.2` for the back-layer cap, or tune the displacement `scale` (4 → smaller if the V is unreadable).

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: succeeds. Husky's pre-push hook also runs this; ensuring it's green now avoids a surprise on push.

- [ ] **Step 5: Final commit if any tuning was applied**

If Step 3 surfaced tuning changes:

```bash
git add shared/ui/flame-monogram/ui/flame-monogram.tsx
git commit -m "fix(flame-monogram): tune fire-V intensity after visual review"
```

If nothing changed in Step 3, skip this step.

- [ ] **Step 6: Hand off to PR**

The branch is ready. Use the project's `pr-description` skill (`/pr-description` or `.claude/skills/pr-description`) to draft the PR. PR base is `develop` (per user's memorized branching rule). Title suggestion: `feat(flame-monogram): rework V into a fire-textured glyph`.

---

## Skill references

- TDD discipline for each task → `@superpowers:test-driven-development`
- Mid-stream debugging if a test mismatch surprises you → `@superpowers:systematic-debugging`
- Before claiming completion → `@superpowers:verification-before-completion`
- For PR draft → project-local `pr-description` skill (`.claude/skills/pr-description/SKILL.md`)

## Out of scope (do not touch)

- `app/globals.css` — keep `flameRise`, `sparkRise`, and `.text-gold-shimmer` as-is; other components still use the shimmer utility.
- `shared/ui/monogram-seal/*` — the small circular V badge is separate.
- `shared/ui/wordmark/*` — the "Violetta B·E·A·U·T·Y" wordmark continues to use `text-gold-shimmer`.
- `views/home/ui/sections/home-hero.tsx`, `views/welcome/ui/welcome-page.tsx` — they consume `<FlameMonogram />` with the existing API; no edits needed.
- Performance optimization (memo, requestIdleCallback, etc.) — current perf budget is acceptable per the spec.
