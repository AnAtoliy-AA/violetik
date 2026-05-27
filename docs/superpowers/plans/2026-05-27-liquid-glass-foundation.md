# Liquid Glass Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land a complete "Liquid Glass" foundation for the Violetik atelier app — new CSS tokens + `GlassSurface` primitive + `useLiquidPress` hook + glass variants on 6 shared primitives + glass migrations on 5 widget chrome components — as a single PR.

**Architecture:** New `shared/ui/glass-surface/` slice provides the foundational tile (`<GlassSurface />`) and the pointer-tracking hook (`useLiquidPress`). Existing primitives gain non-breaking glass variants composed from `GlassSurface`. Widget chrome rewires its root surface to `GlassSurface` while preserving the public widget API. All glass tints and behaviours degrade gracefully under `prefers-reduced-transparency` and `prefers-reduced-motion`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 with `@theme`, TypeScript strict, `motion/react` (Motion for React — never `framer-motion`), `next-intl`, Vitest + Testing Library + jsdom, Storybook (`@storybook/nextjs-vite`) with the `@storybook/addon-vitest` browser project, Playwright. FSD layer rules apply: imports may only point downward (`app/` → `views/` → `widgets/` → `features/` → `entities/` → `shared/`).

**Spec:** [docs/superpowers/specs/2026-05-27-liquid-glass-foundation-design.md](../specs/2026-05-27-liquid-glass-foundation-design.md)

**Branch:** `feature/liquid-glass-foundation` (off `develop`). Single PR targeting `develop`.

---

## Conventions (read before starting)

1. **Use the `commit` project skill** ([.claude/skills/commit/SKILL.md](../../../.claude/skills/commit/SKILL.md)) for every commit — it produces Conventional Commits respecting the repo's Husky pre-commit hook (lint + Vitest) and pre-push hook (build).
2. **Read [AGENTS.md](../../../AGENTS.md) and [CLAUDE.md](../../../CLAUDE.md) once** at the start. Next.js 16 has breaking changes from prior major releases; when uncertain about an API, read `node_modules/next/dist/docs/`.
3. **Shared/ui slice shape** is canonical-by-`shared/ui/button`:
   - `shared/ui/<slice>/index.ts` — public API barrel
   - `shared/ui/<slice>/ui/<slice>.tsx` — component
   - `shared/ui/<slice>/ui/<slice>.stories.tsx` — Storybook stories (mandatory for `shared/ui/*`)
   - `shared/ui/<slice>/ui/<slice>.test.tsx` — Vitest test (mandatory)
   - Optional: `shared/ui/<slice>/lib/<helper>.ts` + colocated test
4. **Imports through slice root** — `@/shared/ui/glass-surface`, never `@/shared/ui/glass-surface/ui/glass-surface`.
5. **Server Components by default** — only add `"use client"` to interactive leaves. `GlassSurface` is split: a server-renderable wrapper that conditionally mounts a client island only when `specular || press`.
6. **No `framer-motion` imports**. Use `motion/react` (Motion v12+). Honour `useReducedMotion()` everywhere.
7. **`cn` helper** lives at [shared/lib/cn/](../../../shared/lib/cn/) (imported as `@/shared/lib/cn`). Use it for className composition.
8. **i18n strings** — none expected in this plan (no user-facing copy changes), but if any creep in: add to `messages/{en,ru,be}.json`.
9. **TDD red/green:** write the failing test first, run it, see it fail, then implement minimal code. Run again, see it pass. Commit. Use [superpowers:test-driven-development](../../../.claude/plugins/cache/claude-plugins-official/superpowers/5.0.5/skills/test-driven-development/) for any non-trivial test design.
10. **Single PR — but commit-by-commit inside it.** Each task below ends with a commit using a Conventional Commit message. Bisect should land meaningfully on any commit.

---

## File Structure

### Created

```
shared/ui/glass-surface/
├── index.ts                                       # barrel
├── ui/
│   ├── glass-surface.tsx                          # server wrapper + client island
│   ├── glass-surface.client.tsx                   # client island (specular/press paths)
│   ├── glass-surface.stories.tsx                  # 7 stories
│   └── glass-surface.test.tsx                     # Vitest
└── lib/
    ├── use-liquid-press.ts                        # hook
    └── use-liquid-press.test.ts                   # Vitest

e2e/
├── liquid-glass-chrome.spec.ts                    # Playwright
└── sheet-glass.spec.ts                            # Playwright
```

### Modified

```
app/globals.css                                    # §1 tokens + utilities + keyframes

shared/ui/sheet/ui/sheet.tsx                       # §3.1
shared/ui/sheet/ui/sheet.test.tsx                  # new test cases
shared/ui/sheet/ui/sheet.stories.tsx               # new "glass" story

shared/ui/toast/ui/toast.tsx                       # §3.2
shared/ui/toast/ui/toast.test.tsx                  # new test cases

shared/ui/button/ui/button.tsx                     # §3.3 — new "glass" variant
shared/ui/button/ui/button.test.tsx                # new test
shared/ui/button/ui/button.stories.tsx             # new "glass" story

shared/ui/spotlight-card/ui/spotlight-card.tsx     # §3.4 — new "variant" prop
shared/ui/spotlight-card/ui/spotlight-card.test.tsx
shared/ui/spotlight-card/ui/spotlight-card.stories.tsx

shared/ui/pressable-surface/ui/pressable-surface.tsx  # §3.5 — `liquid` prop
shared/ui/pressable-surface/ui/pressable-surface.test.tsx

shared/ui/floating-input/ui/floating-input.tsx     # §3.6 — glass container

widgets/app-header/ui/app-header.tsx               # §4.1
widgets/tab-bar/ui/tab-bar.tsx                     # §4.2 — replace inline backdrop with GlassSurface
widgets/nav-sheet/ui/nav-sheet.tsx                 # §4.3
widgets/booking-stepper/ui/booking-stepper.tsx     # §4.4
widgets/tonight-strip/ui/tonight-strip.tsx         # §4.5
```

Test files for modified components may need fresh case additions but the file itself already exists.

---

## Task 1 — Foundation tokens, utilities, keyframes

**Files:**
- Modify: [app/globals.css](../../../app/globals.css)

Adds the backdrop-blur scale, glass tints, utility classes, keyframes, and reduced-motion / reduced-transparency fallbacks. Pure CSS. No JS consumers yet (the next task adds them).

- [ ] **Step 0: Verify the `--backdrop-blur-lg` consumer count hasn't grown since the spec was drafted**

  ```bash
  grep -rn "var(--backdrop-blur-" --include="*.tsx" --include="*.ts" --include="*.css" .
  ```

  Expected: exactly one production consumer — [widgets/tab-bar/ui/tab-bar.tsx](../../../widgets/tab-bar/ui/tab-bar.tsx). If more files now read these CSS-var tokens, pause and update Task 10 / Task 1 to address them before the retune.

- [ ] **Step 1: Insert new blur scale tokens into `@theme {}` block**

  Open [app/globals.css](../../../app/globals.css). Inside the existing `@theme {` block, locate `--backdrop-blur-sm` / `-md` / `-lg`. **Replace** the three existing tokens with a six-step scale:

  ```css
  /* Stacked-glass blur scale (replaces the prior sm/md/lg tokens) */
  --backdrop-blur-xs:  blur(6px)  saturate(140%);
  --backdrop-blur-sm:  blur(10px) saturate(150%);
  --backdrop-blur-md:  blur(16px) saturate(160%);
  --backdrop-blur-lg:  blur(24px) saturate(170%);
  --backdrop-blur-xl:  blur(32px) saturate(180%);
  --backdrop-blur-2xl: blur(44px) saturate(200%);
  ```

  Note: the only file in the repo that reads `var(--backdrop-blur-lg)` today is [widgets/tab-bar/ui/tab-bar.tsx](../../../widgets/tab-bar/ui/tab-bar.tsx); it's being rewritten in Task 10 so the 28px→24px retune is intentional. The Tailwind utility classes `backdrop-blur-sm` / `backdrop-blur-md` used elsewhere are Tailwind built-ins (pixel-valued) and **are unrelated** to these CSS-var tokens.

- [ ] **Step 2: Add glass tints, rim, edge, shadow, specular coords**

  Append within the same `@theme {}` block, right after the blur tokens:

  ```css
  /* Liquid Glass tints, rim, edge, shadow, specular coords */
  --color-glass-warm:   rgba(232, 207, 153, 0.06);
  --color-glass-body:   rgba(244, 234, 216, 0.05);
  --color-glass-cool:   rgba(244, 234, 216, 0.03);
  --color-glass-clear:  rgba(244, 234, 216, 0.015);

  --color-glass-rim:    rgba(255, 245, 214, 0.55);
  --color-glass-edge:   rgba(232, 207, 153, 0.28);

  --shadow-glass:       0 -28px 56px -22px rgba(0, 0, 0, 0.7);

  /* Specular coords — overwritten by useLiquidPress at runtime */
  --lx: 50%;
  --ly: 0%;

  /* New keyframe-backed animation tokens */
  --animate-liquid-press:  liquidPress 320ms var(--ease-out);
  --animate-rim-sweep:     rimSweep 1400ms var(--ease-out);
  --animate-glass-shimmer: glassShimmer 18s ease-in-out infinite;
  ```

- [ ] **Step 3: Add new keyframes**

  Append below the existing `@keyframes ripple { … }` block (so all keyframes stay grouped):

  ```css
  @keyframes liquidPress {
    0%   { transform: scale(1);     }
    35%  { transform: scale(0.985); }
    100% { transform: scale(1);     }
  }

  @keyframes rimSweep {
    0%   { background-position: -100% 50%; opacity: 0; }
    50%  { opacity: 1; }
    100% { background-position:  200% 50%; opacity: 0; }
  }

  @keyframes glassShimmer {
    0%, 100% { background-position: 0%   50%; }
    50%      { background-position: 100% 50%; }
  }
  ```

- [ ] **Step 4: Add glass utility classes**

  Append below the existing `.ripple { … }` block (so all glass utilities follow the ripple utility):

  ```css
  /* === Liquid Glass utilities === */

  .glass {
    background: var(--color-glass-body);
    backdrop-filter: var(--backdrop-blur-lg);
    -webkit-backdrop-filter: var(--backdrop-blur-lg);
    border: 0.5px solid var(--color-glass-edge);
    box-shadow: var(--shadow-glass);
  }

  .glass-warm  { background: var(--color-glass-warm);  }
  .glass-cool  { background: var(--color-glass-cool);  }
  .glass-clear { background: var(--color-glass-clear); }

  .glass-xs  { backdrop-filter: var(--backdrop-blur-xs);  -webkit-backdrop-filter: var(--backdrop-blur-xs);  }
  .glass-sm  { backdrop-filter: var(--backdrop-blur-sm);  -webkit-backdrop-filter: var(--backdrop-blur-sm);  }
  .glass-md  { backdrop-filter: var(--backdrop-blur-md);  -webkit-backdrop-filter: var(--backdrop-blur-md);  }
  .glass-lg  { backdrop-filter: var(--backdrop-blur-lg);  -webkit-backdrop-filter: var(--backdrop-blur-lg);  }
  .glass-xl  { backdrop-filter: var(--backdrop-blur-xl);  -webkit-backdrop-filter: var(--backdrop-blur-xl);  }
  .glass-2xl { backdrop-filter: var(--backdrop-blur-2xl); -webkit-backdrop-filter: var(--backdrop-blur-2xl); }

  /* Lens-edge top rim — always-rendered ::before; consumers transition its opacity. */
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
    opacity: var(--rim-opacity, 1);
    transition: opacity 240ms var(--ease-out);
  }

  /* Pointer-tracked specular highlight — reads --lx / --ly. */
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

  /* Continuous low-cost shimmer — opt-in via class. */
  .glass-shimmer {
    background-size: 200% 100%;
    animation: var(--animate-glass-shimmer);
  }

  /* Liquid press — surface scales briefly on tap. Triggered by data-active
   * which is set by useLiquidPress on pointerdown. Scoped to .glass-press so
   * specular-only surfaces don't accidentally scale. */
  .glass-press[data-active="true"] {
    animation: var(--animate-liquid-press);
  }

  /* Rim-sweep — single-pass gold sweep on the active tab in TabBar (Task 10).
   * Trigger: any element with data-rim-sweep="true". Lives globally so the
   * widget keeps no widget-local CSS. !important on background-image so a
   * sibling Tailwind bg-* utility doesn't silently swallow the sweep. */
  [data-rim-sweep="true"] {
    background-image: linear-gradient(
      90deg,
      transparent 0%,
      rgba(232, 207, 153, 0.55) 30%,
      rgba(255, 245, 214, 0.95) 50%,
      rgba(232, 207, 153, 0.55) 70%,
      transparent 100%) !important;
    background-size: 200% 100%;
    animation: var(--animate-rim-sweep);
  }

  /* Reduced transparency / reduced motion fallbacks */
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
  }
  ```

- [ ] **Step 5: Run lint + tests to confirm nothing regressed**

  ```bash
  npm run lint && npm test
  ```

  Expected: no new errors. The tab-bar may render slightly differently in jsdom but no tests should fail (jsdom does not actually paint the backdrop-filter).

- [ ] **Step 6: Commit (Task 1)**

  Use the [commit](../../../.claude/skills/commit/SKILL.md) skill or run:

  ```bash
  git add app/globals.css
  git commit -m "feat(globals): liquid-glass tokens, utilities, keyframes"
  ```

---

## Task 2 — `<GlassSurface />` primitive + `useLiquidPress` hook

**Files:**
- Create: `shared/ui/glass-surface/index.ts`
- Create: `shared/ui/glass-surface/ui/glass-surface.tsx` (server-renderable wrapper)
- Create: `shared/ui/glass-surface/ui/glass-surface.client.tsx` (client island)
- Create: `shared/ui/glass-surface/ui/glass-surface.stories.tsx`
- Create: `shared/ui/glass-surface/ui/glass-surface.test.tsx`
- Create: `shared/ui/glass-surface/lib/use-liquid-press.ts`
- Create: `shared/ui/glass-surface/lib/use-liquid-press.test.ts`

**Reference patterns:**
- [shared/ui/button/index.ts](../../../shared/ui/button/index.ts) — barrel shape
- [shared/ui/button/ui/button.tsx](../../../shared/ui/button/ui/button.tsx) — forwardRef + className composition

- [ ] **Step 1: Write `use-liquid-press.test.ts` (failing)**

  Path: `shared/ui/glass-surface/lib/use-liquid-press.test.ts`

  ```tsx
  import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
  import { renderHook, act } from "@testing-library/react";
  import { useRef } from "react";
  import { useLiquidPress } from "./use-liquid-press";

  function fireEv(el: HTMLElement, type: string, props: Partial<PointerEvent> = {}) {
    const ev = new Event(type, { bubbles: true }) as unknown as PointerEvent;
    Object.assign(ev, { clientX: 50, clientY: 25, ...props });
    el.dispatchEvent(ev);
  }

  function renderHookWithRef() {
    const target = document.createElement("div");
    Object.defineProperty(target, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => ({}) }),
    });
    document.body.appendChild(target);
    const ref = { current: target };
    const { result } = renderHook(() => useLiquidPress(ref as React.RefObject<HTMLElement>));
    return { ref, target, result };
  }

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => { document.body.innerHTML = ""; });

  describe("useLiquidPress", () => {
    it("writes --lx / --ly on pointermove", () => {
      const { target } = renderHookWithRef();
      act(() => fireEv(target, "pointermove", { clientX: 50, clientY: 25 }));
      expect(target.style.getPropertyValue("--lx")).toBe("50%");
      expect(target.style.getPropertyValue("--ly")).toBe("50%");
    });

    it("sets data-active on pointerdown and clears on pointerup", () => {
      const { target, result } = renderHookWithRef();
      act(() => fireEv(target, "pointerdown", { clientX: 25, clientY: 10 }));
      expect(target.getAttribute("data-active")).toBe("true");
      expect(result.current.pressed).toBe(true);
      act(() => fireEv(target, "pointerup"));
      expect(target.getAttribute("data-active")).toBeNull();
      expect(result.current.pressed).toBe(false);
    });

    it("clears data-active on pointercancel", () => {
      const { target } = renderHookWithRef();
      act(() => fireEv(target, "pointerdown"));
      expect(target.getAttribute("data-active")).toBe("true");
      act(() => fireEv(target, "pointercancel"));
      expect(target.getAttribute("data-active")).toBeNull();
    });

    it("is a no-op when prefers-reduced-motion: reduce", () => {
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: q.includes("reduce"), media: q, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      }));
      const { target } = renderHookWithRef();
      act(() => fireEv(target, "pointermove", { clientX: 75, clientY: 25 }));
      expect(target.style.getPropertyValue("--lx")).toBe("");
    });
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  npx vitest run shared/ui/glass-surface/lib/use-liquid-press.test.ts
  ```

  Expected: FAIL — `Cannot find module './use-liquid-press'`.

- [ ] **Step 3: Implement `use-liquid-press.ts`**

  Path: `shared/ui/glass-surface/lib/use-liquid-press.ts`

  ```tsx
  "use client";

  import { useEffect, useState, type RefObject } from "react";

  export interface UseLiquidPressOptions {
    /** If true, only updates --lx/--ly on press, not on hover. Default false. */
    pressOnly?: boolean;
    /** If true, sets data-active during the press. Default true. */
    setDataActive?: boolean;
  }

  export interface UseLiquidPressReturn {
    pressed: boolean;
  }

  export function useLiquidPress(
    ref: RefObject<HTMLElement | null>,
    options: UseLiquidPressOptions = {},
  ): UseLiquidPressReturn {
    const { pressOnly = false, setDataActive = true } = options;
    const [pressed, setPressed] = useState(false);

    useEffect(() => {
      const node = ref.current;
      if (!node) return;
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const writeCoords = (e: PointerEvent) => {
        const rect = node.getBoundingClientRect();
        const lx = ((e.clientX - rect.left) / rect.width) * 100;
        const ly = ((e.clientY - rect.top) / rect.height) * 100;
        node.style.setProperty("--lx", `${lx}%`);
        node.style.setProperty("--ly", `${ly}%`);
      };

      const onMove = (e: PointerEvent) => {
        if (pressOnly && !pressed) return;
        writeCoords(e);
      };
      const onDown = (e: PointerEvent) => {
        writeCoords(e);
        if (setDataActive) node.setAttribute("data-active", "true");
        setPressed(true);
      };
      const clear = () => {
        if (setDataActive) node.removeAttribute("data-active");
        setPressed(false);
      };

      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerdown", onDown);
      node.addEventListener("pointerup", clear);
      node.addEventListener("pointercancel", clear);
      node.addEventListener("pointerleave", clear);

      return () => {
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerdown", onDown);
        node.removeEventListener("pointerup", clear);
        node.removeEventListener("pointercancel", clear);
        node.removeEventListener("pointerleave", clear);
      };
    }, [ref, pressOnly, setDataActive, pressed]);

    return { pressed };
  }
  ```

- [ ] **Step 4: Run the hook test to confirm it passes**

  ```bash
  npx vitest run shared/ui/glass-surface/lib/use-liquid-press.test.ts
  ```

  Expected: PASS (all 4 cases).

- [ ] **Step 5: Write `glass-surface.test.tsx` (failing)**

  Path: `shared/ui/glass-surface/ui/glass-surface.test.tsx`

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, screen } from "@testing-library/react";
  import { createRef } from "react";
  import { GlassSurface } from "./glass-surface";

  describe("GlassSurface", () => {
    it("renders as a div by default with data-glass attribute", () => {
      render(<GlassSurface>hello</GlassSurface>);
      const root = screen.getByText("hello").closest("[data-glass]")!;
      expect(root.tagName).toBe("DIV");
      expect(root.getAttribute("data-glass")).toBe("true");
    });

    it("composes tint and blur classes from props", () => {
      render(
        <GlassSurface tint="warm" blur="xl">
          <span>body</span>
        </GlassSurface>,
      );
      const root = screen.getByText("body").closest("[data-glass]")!;
      expect(root.className).toMatch(/glass-warm/);
      expect(root.className).toMatch(/glass-xl/);
    });

    it("applies rim and specular classes when enabled", () => {
      render(
        <GlassSurface rim specular>
          <span>body</span>
        </GlassSurface>,
      );
      const root = screen.getByText("body").closest("[data-glass]")!;
      expect(root.className).toMatch(/glass-rim/);
      expect(root.className).toMatch(/glass-specular/);
    });

    it("applies glass-press class when press is true", () => {
      render(
        <GlassSurface as="button" press>
          <span>tap</span>
        </GlassSurface>,
      );
      const root = screen.getByRole("button");
      expect(root.className).toMatch(/glass-press/);
    });

    it("renders as the polymorphic `as` element", () => {
      render(
        <GlassSurface as="section">
          <span>body</span>
        </GlassSurface>,
      );
      const root = screen.getByText("body").closest("[data-glass]")!;
      expect(root.tagName).toBe("SECTION");
    });

    it("renders as a button with type='button' default", () => {
      render(
        <GlassSurface as="button">
          <span>tap</span>
        </GlassSurface>,
      );
      const root = screen.getByRole("button");
      expect(root.getAttribute("type")).toBe("button");
    });

    it("forwards className after variant classes", () => {
      render(
        <GlassSurface className="custom-class">
          <span>body</span>
        </GlassSurface>,
      );
      const root = screen.getByText("body").closest("[data-glass]")!;
      expect(root.className).toMatch(/custom-class/);
    });

    it("forwards ref on the static (non-interactive) branch", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <GlassSurface ref={ref}>
          <span>body</span>
        </GlassSurface>,
      );
      expect(ref.current).not.toBeNull();
      expect(ref.current?.getAttribute("data-glass")).toBe("true");
    });

    it("forwards ref on the interactive (press) branch", () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <GlassSurface as="button" press ref={ref}>
          <span>tap</span>
        </GlassSurface>,
      );
      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe("BUTTON");
    });
  });
  ```

- [ ] **Step 6: Run the test to confirm it fails**

  ```bash
  npx vitest run shared/ui/glass-surface/ui/glass-surface.test.tsx
  ```

  Expected: FAIL — module not found.

- [ ] **Step 7: Implement `glass-surface.tsx` (server-renderable, ref-forwarding)**

  Path: `shared/ui/glass-surface/ui/glass-surface.tsx`

  ```tsx
  import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ForwardedRef,
    type ReactNode,
  } from "react";
  import { cn } from "@/shared/lib/cn";
  import { InteractiveGlassSurface } from "./glass-surface.client";

  export type GlassTint = "warm" | "body" | "cool" | "clear";
  export type GlassBlur = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  export type GlassElevation = 0 | 1 | 2 | 3;

  export type GlassSurfaceAs =
    | "div"
    | "section"
    | "aside"
    | "nav"
    | "header"
    | "footer"
    | "button";

  type AnyHtmlProps = ComponentPropsWithoutRef<"div"> &
    ComponentPropsWithoutRef<"button">;

  export interface GlassSurfaceProps extends Omit<AnyHtmlProps, "children"> {
    as?: GlassSurfaceAs;
    tint?: GlassTint;
    blur?: GlassBlur;
    rim?: boolean;
    specular?: boolean;
    press?: boolean;
    elevation?: GlassElevation;
    className?: string;
    children: ReactNode;
  }

  const tintClass: Record<GlassTint, string> = {
    warm: "glass-warm",
    body: "",
    cool: "glass-cool",
    clear: "glass-clear",
  };

  const blurClass: Record<GlassBlur, string> = {
    xs: "glass-xs",
    sm: "glass-sm",
    md: "glass-md",
    lg: "glass-lg",
    xl: "glass-xl",
    "2xl": "glass-2xl",
  };

  const elevationShadow: Record<GlassElevation, string> = {
    0: "",
    1: "shadow-card",
    2: "shadow-soft",
    3: "shadow-lifted",
  };

  export function glassSurfaceClassName({
    tint = "body",
    blur = "lg",
    rim = false,
    specular = false,
    press = false,
    elevation = 1,
    className,
  }: Pick<
    GlassSurfaceProps,
    "tint" | "blur" | "rim" | "specular" | "press" | "elevation" | "className"
  > = {}) {
    return cn(
      "glass",
      tintClass[tint],
      blurClass[blur],
      rim && "glass-rim",
      specular && "glass-specular",
      press && "glass-press",
      elevationShadow[elevation],
      className,
    );
  }

  export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(
    function GlassSurface(props, ref) {
      const {
        as = "div",
        tint = "body",
        blur = "lg",
        rim = false,
        specular = false,
        press = false,
        elevation = 1,
        className,
        children,
        ...rest
      } = props;

      const composedClass = glassSurfaceClassName({
        tint,
        blur,
        rim,
        specular,
        press,
        elevation,
        className,
      });

      if (specular || press) {
        return (
          <InteractiveGlassSurface
            as={as}
            className={composedClass}
            press={press}
            specular={specular}
            ref={ref as ForwardedRef<HTMLElement>}
            {...rest}
          >
            {children}
          </InteractiveGlassSurface>
        );
      }

      const Tag = as as "div";
      const elementProps: Record<string, unknown> = {
        "data-glass": "true",
        className: composedClass,
        ref,
        ...rest,
      };
      if (as === "button" && !("type" in rest)) {
        elementProps.type = "button";
      }
      return <Tag {...(elementProps as ComponentPropsWithoutRef<"div">)}>{children}</Tag>;
    },
  );
  ```

- [ ] **Step 8: Implement `glass-surface.client.tsx`**

  Path: `shared/ui/glass-surface/ui/glass-surface.client.tsx`

  Logic for `pressOnly`:
  - `specular` true → track pointer on hover and press → `pressOnly: false`
  - `press` only (no specular) → track pointer only when pressed → `pressOnly: true`
  - Both true → specular wins → `pressOnly: false`

  Simplification: `pressOnly: !specular`. (We only reach this island when `specular || press`.)

  ```tsx
  "use client";

  import {
    forwardRef,
    useImperativeHandle,
    useRef,
    type ForwardedRef,
    type ReactNode,
  } from "react";
  import { useLiquidPress } from "../lib/use-liquid-press";
  import type { GlassSurfaceAs } from "./glass-surface";

  export interface InteractiveGlassSurfaceProps {
    as: GlassSurfaceAs;
    className: string;
    press: boolean;
    specular: boolean;
    children: ReactNode;
    [key: string]: unknown;
  }

  export const InteractiveGlassSurface = forwardRef<
    HTMLElement,
    InteractiveGlassSurfaceProps
  >(function InteractiveGlassSurface(
    { as, className, press, specular, children, ...rest },
    forwardedRef,
  ) {
    const rootRef = useRef<HTMLElement | null>(null);
    useImperativeHandle(forwardedRef, () => rootRef.current as HTMLElement);
    useLiquidPress(rootRef, { pressOnly: !specular });

    const Tag = as as "div";
    const props: Record<string, unknown> = {
      ref: rootRef,
      "data-glass": "true",
      className,
      ...rest,
    };
    if (as === "button" && !("type" in rest)) {
      props.type = "button";
    }
    return <Tag {...props}>{children}</Tag>;
  });
  ```

- [ ] **Step 9: Add `index.ts` barrel**

  Path: `shared/ui/glass-surface/index.ts`

  ```ts
  export { GlassSurface, glassSurfaceClassName } from "./ui/glass-surface";
  export type {
    GlassSurfaceProps,
    GlassTint,
    GlassBlur,
    GlassElevation,
    GlassSurfaceAs,
  } from "./ui/glass-surface";
  export { useLiquidPress } from "./lib/use-liquid-press";
  export type {
    UseLiquidPressOptions,
    UseLiquidPressReturn,
  } from "./lib/use-liquid-press";
  ```

- [ ] **Step 10: Run the tests to confirm both pass**

  ```bash
  npx vitest run shared/ui/glass-surface
  ```

  Expected: PASS — 4 hook tests + 6 component tests = 10 cases.

- [ ] **Step 11: Add Storybook stories (7 stories)**

  Path: `shared/ui/glass-surface/ui/glass-surface.stories.tsx`

  ```tsx
  import type { Meta, StoryObj } from "@storybook/nextjs-vite";
  import { GlassSurface } from "./glass-surface";

  const Backdrop = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        padding: 60,
        background:
          "radial-gradient(60% 40% at 30% 30%, #7d3a6f, transparent 70%), radial-gradient(50% 35% at 75% 70%, #9d7bc7, transparent 65%), #100612",
        borderRadius: 18,
      }}
    >
      {children}
    </div>
  );

  const meta: Meta<typeof GlassSurface> = {
    title: "shared/ui/GlassSurface",
    component: GlassSurface,
    parameters: { layout: "centered" },
    decorators: [(Story) => <Backdrop><Story /></Backdrop>],
  };
  export default meta;
  type Story = StoryObj<typeof GlassSurface>;

  const Body = (
    <div style={{ padding: 24, color: "#f4ead8", minWidth: 280 }}>
      <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 22 }}>Sculpture italienne</div>
      <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        · Tonight · 21:00 ·
      </div>
    </div>
  );

  export const Default: Story = { args: { children: Body } };
  export const Warm: Story = { args: { tint: "warm", children: Body } };
  export const WithRim: Story = { args: { tint: "warm", rim: true, children: Body } };
  export const WithRimAndSpecular: Story = {
    args: { tint: "warm", rim: true, specular: true, children: Body },
  };
  export const WithPress: Story = {
    args: { as: "button", tint: "warm", press: true, children: Body },
  };
  export const HeavyBlur: Story = { args: { tint: "warm", blur: "2xl", rim: true, children: Body } };
  export const AsSection: Story = { args: { as: "section", tint: "cool", children: Body } };
  ```

- [ ] **Step 12: Run lint + tests + build storybook to confirm green**

  ```bash
  npm run lint && npm test && npm run build-storybook
  ```

- [ ] **Step 13: Commit (Task 2)**

  ```bash
  git add shared/ui/glass-surface
  git commit -m "feat(shared/ui): GlassSurface primitive + useLiquidPress hook"
  ```

---

## Task 3 — `<Sheet />` glass body

**Files:**
- Modify: [shared/ui/sheet/ui/sheet.tsx](../../../shared/ui/sheet/ui/sheet.tsx)
- Modify (or create if missing): `shared/ui/sheet/ui/sheet.test.tsx`
- Modify (or create if missing): `shared/ui/sheet/ui/sheet.stories.tsx`

The sheet body's outer styling moves to `<GlassSurface tint="warm" blur="2xl" rim specular elevation={3}>`. All `motion`, drag, focus-trap, scrim, and snap-points logic stays intact. The handle, title, and children rendering stay identical.

- [ ] **Step 1: Read current sheet implementation**

  Read [shared/ui/sheet/ui/sheet.tsx](../../../shared/ui/sheet/ui/sheet.tsx) end-to-end. Note the existing `bg-surface text-text rounded-t-2xl shadow-lifted border-t border-line-strong/60` className on the `m.div` sheet root (lines ~197–203).

- [ ] **Step 2: Add a failing test for the glass body**

  Path: `shared/ui/sheet/ui/sheet.test.tsx` (extend existing file or create)

  Add:
  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, screen } from "@testing-library/react";
  import { Sheet } from "./sheet";

  describe("Sheet — glass body", () => {
    it("renders the sheet body as a GlassSurface (data-glass='true' on body)", () => {
      render(
        <Sheet open onOpenChange={() => {}}>
          <div>contents</div>
        </Sheet>,
      );
      const body = screen.getByText("contents").closest("[data-glass]")!;
      expect(body).not.toBeNull();
      expect(body.getAttribute("data-glass")).toBe("true");
      expect(body.className).toMatch(/glass-warm/);
      expect(body.className).toMatch(/glass-2xl/);
      expect(body.className).toMatch(/glass-rim/);
      expect(body.className).toMatch(/glass-specular/);
    });
  });
  ```

- [ ] **Step 3: Run test to confirm it fails**

  ```bash
  npx vitest run shared/ui/sheet/ui/sheet.test.tsx
  ```

  Expected: FAIL — no `[data-glass]` element.

- [ ] **Step 4: Refactor the sheet to use GlassSurface**

  In [shared/ui/sheet/ui/sheet.tsx](../../../shared/ui/sheet/ui/sheet.tsx):

  Add import at the top:
  ```ts
  import { glassSurfaceClassName } from "@/shared/ui/glass-surface";
  ```

  Replace the existing `className={cn(...)}` block on the `m.div key="sheet"` element (around lines 197–203) with:

  ```ts
  className={cn(
    "relative w-full max-w-[640px] h-[100vh]",
    "text-text rounded-t-2xl",
    "outline-none flex flex-col",
    glassSurfaceClassName({
      tint: "warm",
      blur: "2xl",
      rim: true,
      specular: true,
      elevation: 3,
    }),
  )}
  ```

  Also add `data-glass="true"` to the same `m.div`'s props (Motion forwards data-attrs):
  ```ts
  data-glass="true"
  ```

  Remove the now-redundant `bg-surface` and `shadow-lifted` and `border-t border-line-strong/60` since GlassSurface provides those. Keep `rounded-t-2xl` (GlassSurface emits `border-radius: inherit` reads on the rim/specular pseudos).

- [ ] **Step 5: Run the test to confirm it passes**

  ```bash
  npx vitest run shared/ui/sheet/ui/sheet.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 6: Add a story showcasing the glass body**

  Path: `shared/ui/sheet/ui/sheet.stories.tsx` (extend or create)

  Add a new `GlassBody` story exercising open state with `children` containing dummy content. If the file doesn't exist yet, model on [shared/ui/button/ui/button.stories.tsx](../../../shared/ui/button/ui/button.stories.tsx).

- [ ] **Step 7: Verify all sheet tests still pass + lint**

  ```bash
  npx vitest run shared/ui/sheet && npm run lint
  ```

- [ ] **Step 8: Commit (Task 3)**

  ```bash
  git add shared/ui/sheet
  git commit -m "feat(shared/ui/sheet): glass body (warm + 2xl + rim + specular)"
  ```

---

## Task 4 — `<Toast />` glass body + swipe dismiss

**Files:**
- Modify: [shared/ui/toast/ui/toast.tsx](../../../shared/ui/toast/ui/toast.tsx)
- Modify: `shared/ui/toast/ui/toast.test.tsx`

The toast becomes a `<GlassSurface tint="warm" blur="lg" rim elevation={2}>`. Drag-to-dismiss is added via Motion `m.div` with `drag="x"`, `dragElastic`, dismissing past 60% velocity.

- [ ] **Step 1: Add a failing test asserting the toast renders with glass classes**

  Extend the existing test file (use the existing test structure as reference — read [shared/ui/toast/ui/toast.test.tsx](../../../shared/ui/toast/ui/toast.test.tsx) first):

  ```tsx
  it("renders the toast as a GlassSurface (data-glass='true')", () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{ id: "1", body: "Hello", intent: "info" }}
        onDismiss={onDismiss}
      />,
    );
    const root = screen.getByText("Hello").closest("[data-glass]")!;
    expect(root.getAttribute("data-glass")).toBe("true");
    expect(root.className).toMatch(/glass-warm/);
    expect(root.className).toMatch(/glass-lg/);
    expect(root.className).toMatch(/glass-rim/);
  });
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npx vitest run shared/ui/toast
  ```

- [ ] **Step 3: Refactor the toast**

  In [shared/ui/toast/ui/toast.tsx](../../../shared/ui/toast/ui/toast.tsx):

  Replace the outer `<div>` with `<GlassSurface tint="warm" blur="lg" rim elevation={2}>`. Remove the now-redundant `gilded rounded-md shadow-card bg-surface/95 backdrop-blur-md` classes, but keep `text-text px-4 py-3 max-w-[min(360px,calc(100vw-32px))] flex items-start gap-3`. Pass `className` through.

  Wrap in a `motion/react` `m.div` for swipe (drag="x", dragConstraints={{left:0,right:0}}, dragElastic=0.2). On `onDragEnd` velocity > 600 or offset > width/2, call `onDismiss(toast.id)`.

  Skeleton:
  ```tsx
  import { m, useReducedMotion, type PanInfo } from "motion/react";
  import { GlassSurface } from "@/shared/ui/glass-surface";
  // …existing imports…

  export function Toast({ toast, onDismiss, className, ...rest }: ToastProps) {
    const reduced = useReducedMotion();
    return (
      <m.div
        drag={reduced ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info: PanInfo) => {
          if (Math.abs(info.velocity.x) > 600 || Math.abs(info.offset.x) > 120) {
            onDismiss(toast.id);
          }
        }}
      >
        <GlassSurface
          tint="warm"
          blur="lg"
          rim
          elevation={2}
          className={cn(
            "rounded-md",
            "text-text px-4 py-3 max-w-[min(360px,calc(100vw-32px))]",
            "flex items-start gap-3",
            className,
          )}
          role={toast.intent === "error" ? "alert" : "status"}
          {...rest}
        >
          {/* existing dot + body + dismiss button unchanged */}
        </GlassSurface>
      </m.div>
    );
  }
  ```

- [ ] **Step 4: Run tests to confirm pass**

  ```bash
  npx vitest run shared/ui/toast && npm run lint
  ```

- [ ] **Step 5: Commit (Task 4)**

  ```bash
  git add shared/ui/toast
  git commit -m "feat(shared/ui/toast): glass body + swipe-to-dismiss"
  ```

---

## Task 5 — `<Button />` glass variant

**Files:**
- Modify: [shared/ui/button/ui/button.tsx](../../../shared/ui/button/ui/button.tsx)
- Modify: `shared/ui/button/ui/button.test.tsx`
- Modify: `shared/ui/button/ui/button.stories.tsx`

Existing variants (`solid`, `gold`, `outline`, `ghost`) unchanged. New `variant="glass"`.

- [ ] **Step 1: Add a failing test for the glass variant**

  Extend `button.test.tsx`:
  ```tsx
  it("renders glass variant via GlassSurface", () => {
    render(<Button variant="glass">Press</Button>);
    const btn = screen.getByRole("button", { name: "Press" });
    expect(btn.getAttribute("data-glass")).toBe("true");
    expect(btn.className).toMatch(/glass-warm/);
    expect(btn.className).toMatch(/glass-md/);
  });
  ```

- [ ] **Step 2: Run test to confirm fail**

- [ ] **Step 3: Implement the glass variant**

  In [shared/ui/button/ui/button.tsx](../../../shared/ui/button/ui/button.tsx):

  Update `ButtonVariant`:
  ```ts
  export type ButtonVariant = "solid" | "gold" | "outline" | "ghost" | "glass";
  ```

  In the `Button` `forwardRef`, before the existing return, add an early branch:
  ```tsx
  if (variant === "glass") {
    return (
      <GlassSurface
        ref={ref as Ref<HTMLButtonElement>}
        as="button"
        tint="warm"
        blur="md"
        press
        elevation={1}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium leading-none",
          "transition-colors disabled:opacity-50 disabled:pointer-events-none",
          sizeClass[size],
          block && "w-full",
          "text-text",
          className,
        )}
        {...rest}
      >
        {icon}
        {children}
      </GlassSurface>
    );
  }
  ```

  Add `Ref` import from `react`, and `GlassSurface` import from `@/shared/ui/glass-surface`. (`GlassSurface` forwards refs natively per Task 2 — no extra ref plumbing needed here.)

- [ ] **Step 4: Run test to confirm pass**

- [ ] **Step 5: Add a Storybook story `Glass`**

  Extend [shared/ui/button/ui/button.stories.tsx](../../../shared/ui/button/ui/button.stories.tsx) — model on the existing variant stories.

- [ ] **Step 6: Lint + test + commit**

  ```bash
  npm run lint && npm test
  git add shared/ui/button
  git commit -m "feat(shared/ui/button): glass variant"
  ```

---

## Task 6 — `<SpotlightCard />` glass variant

**Files:**
- Modify: [shared/ui/spotlight-card/ui/spotlight-card.tsx](../../../shared/ui/spotlight-card/ui/spotlight-card.tsx)
- Modify: `shared/ui/spotlight-card/ui/spotlight-card.test.tsx`
- Modify: `shared/ui/spotlight-card/ui/spotlight-card.stories.tsx`

Adds `variant?: "solid" | "glass"` defaulting to `"solid"` (existing behaviour). Per spec §3.4, the spotlight gradient and the glass specular highlight must coexist by living on **different elements' `::after` pseudo-elements**. The plan composes them with a nested structure: outer `<GlassSurface specular>` (owns `.glass-specular::after`), inner `<div class="spotlight">` (owns `.spotlight::after` and the `--mx/--my` pointer tracking).

- [ ] **Step 1: Failing test for `variant="glass"`**

  ```tsx
  it("renders glass variant with nested spotlight inside a GlassSurface", () => {
    render(<SpotlightCard variant="glass">body</SpotlightCard>);
    const text = screen.getByText("body");
    const spotlight = text.closest(".spotlight")!;
    const surface = text.closest("[data-glass]")!;
    expect(spotlight).not.toBeNull();
    expect(surface).not.toBeNull();
    // The glass surface is the outer of the two — spotlight is its descendant.
    expect(surface.contains(spotlight)).toBe(true);
    expect(surface.className).toMatch(/glass-warm/);
    expect(surface.className).toMatch(/glass-specular/);
  });

  it("solid variant is unchanged (no GlassSurface wrapper)", () => {
    render(<SpotlightCard variant="solid">body</SpotlightCard>);
    const text = screen.getByText("body");
    expect(text.closest("[data-glass]")).toBeNull();
    expect(text.closest(".spotlight")).not.toBeNull();
  });
  ```

- [ ] **Step 2: Confirm failing**

- [ ] **Step 3: Implement the nested structure**

  ```tsx
  import { GlassSurface } from "@/shared/ui/glass-surface";

  export type SpotlightCardVariant = "solid" | "glass";

  export interface SpotlightCardProps extends HTMLAttributes<HTMLElement> {
    as?: Tag;
    variant?: SpotlightCardVariant;
    children: ReactNode;
  }

  export function SpotlightCard({
    as: Component = "div",
    variant = "solid",
    className,
    children,
    onPointerMove,
    ...rest
  }: SpotlightCardProps) {
    const handlePointerMove = useCallback(/* unchanged */);

    if (variant === "glass") {
      const TagInner = Component as "div";
      return (
        <GlassSurface
          tint="warm"
          blur="lg"
          rim={false}
          specular
          elevation={1}
          className={cn("rounded-lg", className)}
          {...(rest as HTMLAttributes<HTMLDivElement>)}
        >
          {/* Forward consumer-passed onPointerMove composed with the spotlight
            * tracker so the inner element handles both. */}
          <TagInner
            onPointerMove={handlePointerMove}
            className="spotlight rounded-lg"
          >
            {children}
          </TagInner>
        </GlassSurface>
      );
    }

    // existing solid variant path — unchanged
    const Tag = Component as "div";
    return (
      <Tag
        onPointerMove={handlePointerMove}
        className={cn("spotlight rounded-lg", className)}
        {...(rest as HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </Tag>
    );
  }
  ```

  Note: the glass variant has TWO pointer effects — the outer GlassSurface's specular highlight (writes `--lx/--ly`) and the inner `.spotlight` (writes `--mx/--my`). They paint on different pseudo-elements of different DOM nodes, so they never compete for the same `::after`.

- [ ] **Step 4: Confirm passing + add Story + commit**

  ```bash
  npx vitest run shared/ui/spotlight-card && npm run lint
  git add shared/ui/spotlight-card
  git commit -m "feat(shared/ui/spotlight-card): glass variant (nested spotlight)"
  ```

---

## Task 7 — `<PressableSurface />` liquid press

**Files:**
- Modify: [shared/ui/pressable-surface/ui/pressable-surface.tsx](../../../shared/ui/pressable-surface/ui/pressable-surface.tsx)
- Modify: `shared/ui/pressable-surface/ui/pressable-surface.test.tsx`

Adds `liquid?: boolean` (default `true`). When `liquid: true`, attaches `useLiquidPress(ref, { pressOnly: true })` and adds `glass-specular` class to the root.

- [ ] **Step 1: Failing test**

  ```tsx
  it("by default attaches liquid press (data-active set on pointerdown)", () => {
    render(<PressableSurface>Tap</PressableSurface>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.className).toMatch(/glass-specular/);
    fireEvent.pointerDown(btn, { clientX: 5, clientY: 5 });
    expect(btn.getAttribute("data-active")).toBe("true");
  });

  it("liquid=false omits glass-specular and never sets data-active from the hook", () => {
    render(<PressableSurface liquid={false}>Tap</PressableSurface>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.className).not.toMatch(/glass-specular/);
  });
  ```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

  Add prop:
  ```ts
  liquid?: boolean;
  ```

  In the component:
  ```tsx
  const { liquid = true, ... } = props;
  useLiquidPress(localRef as RefObject<HTMLElement | null>, { pressOnly: true });
  ```

  Add `glass-specular` to className when `liquid`. **Stacking-context audit (mandatory before commit):**

  1. Run `npm run storybook` and open the story `shared/ui/PressableSurface — Default` (or create one named `WithLiquid` that explicitly sets `liquid={true}`).
  2. Hover the surface — the specular highlight should follow the pointer as a soft radial.
  3. Click — a ripple should expand from the click point. The ripple must visibly paint **on top of** the specular highlight.
  4. If the ripple is under the specular: add to [app/globals.css](../../../app/globals.css) (or as a scoped utility):

     ```css
     /* PressableSurface — explicit z stack when ripple and specular coexist. */
     .ripple-host.glass-specular > .ripple { z-index: 2; }
     .ripple-host.glass-specular::after   { z-index: 0; }
     ```

  Take a screenshot of the verified state and paste it in the PR description.

- [ ] **Step 4: Confirm pass + lint + commit**

  ```bash
  git add shared/ui/pressable-surface
  git commit -m "feat(shared/ui/pressable-surface): liquid press alongside ripple"
  ```

---

## Task 8 — `<FloatingInput />` glass container + focus-lit rim

**Files:**
- Modify: [shared/ui/floating-input/ui/floating-input.tsx](../../../shared/ui/floating-input/ui/floating-input.tsx)
- Modify (create if missing): `shared/ui/floating-input/ui/floating-input.test.tsx`

Wraps the input in `<GlassSurface tint="body" blur="md" rim elevation={1}>`. The rim's `::before` is always rendered; opacity transitions from `0` (default) to `1` on focus. On focus, the tint transitions to `warm` via background-color transition.

- [ ] **Step 1: Failing test**

  ```tsx
  it("wraps input in a GlassSurface and toggles --rim-opacity on focus", () => {
    render(<FloatingInput label="Email" />);
    const input = screen.getByLabelText("Email");
    const surface = input.closest("[data-glass]")!;
    expect(surface).not.toBeNull();
    expect(surface.style.getPropertyValue("--rim-opacity")).toBe("0");
    fireEvent.focus(input);
    expect(surface.style.getPropertyValue("--rim-opacity")).toBe("1");
  });
  ```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

  Wrap the existing input + label inside a `<GlassSurface tint={focused ? 'warm' : 'body'} blur="md" rim elevation={1} style={{ '--rim-opacity': focused ? 1 : 0 } as CSSProperties}>`. Keep the `relative` positioning class on the outer wrapper.

- [ ] **Step 4: Pass + lint + commit**

  ```bash
  git add shared/ui/floating-input
  git commit -m "feat(shared/ui/floating-input): glass container + focus-lit rim"
  ```

---

## Checkpoint — between `shared/ui` and `widgets`

All six primitive upgrades are done. Run the full suite once before starting widget chrome work:

```bash
npm run lint && npm test && npm run build-storybook
```

All green. If anything fails here, fix in the appropriate prior task before continuing — widget tasks will compose these primitives and surface regressions through to the chrome.

---

## Task 9 — `<AppHeader />` glass sticky chrome

**Files:**
- Modify: `widgets/app-header/ui/app-header.tsx`

Replace the root element with `<GlassSurface as="header" tint="warm" blur="xl" elevation={2}>`. Preserve sticky positioning, the bottom gilded hairline, and every child.

- [ ] **Step 1: Read [widgets/app-header/ui/app-header.tsx](../../../widgets/app-header/ui/app-header.tsx) end-to-end**

- [ ] **Step 2: Add a test asserting the header carries `data-glass`**

  Path: `widgets/app-header/ui/app-header.test.tsx` (create if missing — see [widgets/tab-bar](../../../widgets/tab-bar/) for the widget-level test pattern):

  ```tsx
  it("renders the header root as a GlassSurface", () => {
    render(<AppHeader />); // mock locale/intl provider per widget conventions
    const header = screen.getByRole("banner");
    expect(header.getAttribute("data-glass")).toBe("true");
    expect(header.className).toMatch(/glass-warm/);
    expect(header.className).toMatch(/glass-xl/);
  });
  ```

  If the existing widget test doesn't already wrap with `NextIntlClientProvider`, copy the pattern from another widget's test (e.g. `tab-bar.test.tsx` if present, or look at [vitest.setup.ts](../../../vitest.setup.ts) for global setup).

- [ ] **Step 3: Confirm fail**

- [ ] **Step 4: Implement**

  Swap the outer `<header>` for `<GlassSurface as="header" tint="warm" blur="xl" elevation={2} className="sticky top-0 z-50 …existing classes…">`. Preserve the bottom gilded hairline (it's currently a `border-image` linear-gradient — keep it as-is via className).

- [ ] **Step 5: Pass + lint + commit**

  ```bash
  git add widgets/app-header
  git commit -m "feat(widgets/app-header): glass sticky chrome"
  ```

---

## Task 10 — `<TabBar />` glass floating dock

**Files:**
- Modify: [widgets/tab-bar/ui/tab-bar.tsx](../../../widgets/tab-bar/ui/tab-bar.tsx)
- Modify: existing `tab-bar.test.tsx` (or create)

Replace the inline `style={{ backdropFilter: 'var(--backdrop-blur-lg)' … }}` on the `<ul>` with `<GlassSurface tint="warm" blur="2xl" rim specular elevation={3}>`. Tab links remain `<Link>` (i18n-aware). Active tab gets a `data-active="true"` attribute that triggers a rim-sweep animation via CSS.

- [ ] **Step 1: Add a failing test for the dock surface**

  ```tsx
  it("renders the tab dock as a GlassSurface", () => {
    render(<TabBar />); // wrap with NextIntlClientProvider as needed
    const nav = screen.getByRole("navigation");
    const dock = nav.querySelector("[data-glass]")!;
    expect(dock).not.toBeNull();
    expect(dock.className).toMatch(/glass-warm/);
    expect(dock.className).toMatch(/glass-2xl/);
  });
  ```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Refactor**

  Replace:
  ```tsx
  <ul
    className={cn("glass-top relative …", "h-14 rounded-full border-[0.5px] border-line-strong bg-bg-2/70 shadow-card")}
    style={{ backdropFilter: "var(--backdrop-blur-lg)", WebkitBackdropFilter: "var(--backdrop-blur-lg)" }}
  >
    …
  </ul>
  ```
  With:
  ```tsx
  <GlassSurface
    as="nav" // or use a ul inside — but a ul cannot accept data-glass cleanly; keep an outer GlassSurface div and put the ul inside
  >
    <ul className="…existing flex layout…">
      {…tabs…}
    </ul>
  </GlassSurface>
  ```
  Easiest path: convert the `<ul>` to a `<GlassSurface as="div" tint="warm" blur="2xl" rim specular elevation={3} className="…layout classes…">` containing the list items inline (a list role isn't required because `<nav aria-label>` already provides accessible labelling). Audit semantics — if a list role is needed, wrap with `role="list"`.

  For the active tab's rim-sweep animation: rely on the global `[data-rim-sweep="true"]` selector added in Task 1 Step 4. On the active tab `<Link>` element, conditionally set `data-rim-sweep={isActive ? "true" : undefined}`. The CSS rule and keyframe are already global — no widget-local CSS is added here.

  **Widget-test provider note:** new tests added under `widgets/tab-bar/` need to wrap with `NextIntlClientProvider` (and any other providers the tab-bar reads). Consult [vitest.setup.ts](../../../vitest.setup.ts) and the nearest existing widget test for the provider pattern; copy that pattern verbatim.

- [ ] **Step 4: Pass + lint + commit**

  ```bash
  git add widgets/tab-bar
  git commit -m "feat(widgets/tab-bar): glass floating dock"
  ```

---

## Task 11 — `<NavSheet />` compose upgraded Sheet

**Files:**
- Modify: `widgets/nav-sheet/ui/nav-sheet.tsx`

If the nav-sheet already uses `<Sheet />` from `shared/ui/sheet`, this task is a no-op verification — the glass body comes for free via Task 3.

- [ ] **Step 1: Read [widgets/nav-sheet/ui/nav-sheet.tsx](../../../widgets/nav-sheet/ui/nav-sheet.tsx)**

  Confirm it uses `<Sheet>` (or a local `backdrop-blur-md` portal). If it uses `<Sheet>`: skip to Step 4.

- [ ] **Step 2: If not, refactor to use `<Sheet>`**

  Replace the local sheet implementation with `import { Sheet } from "@/shared/ui/sheet"`. Map existing props.

- [ ] **Step 3: Add a test confirming the nav-sheet renders a glass-bodied sheet**

  Open `<NavSheet open />`, query for `[data-glass]`, assert.

- [ ] **Step 4: Commit (only if files changed)**

  ```bash
  git status --short widgets/nav-sheet
  ```

  If the working tree shows changes:
  ```bash
  git add widgets/nav-sheet
  git commit -m "feat(widgets/nav-sheet): compose upgraded glass sheet"
  ```

  If no files changed (nav-sheet already composes `<Sheet>` and the glass body came for free via Task 3), **skip the commit entirely**. Do not use `--allow-empty` with a `feat:` prefix — conventional-commit lint will reject it. The task is verified-complete without a commit.

---

## Task 12 — `<BookingStepper />` glass chrome

**Files:**
- Modify: `widgets/booking-stepper/ui/booking-stepper.tsx`

Wrap the stepper chrome in `<GlassSurface tint="cool" blur="md" elevation={1}>`. Verify the `scaleX(0 → 1)` segment motion prescribed in Phase 1 is implemented; if not, add it.

- [ ] **Step 1: Read [widgets/booking-stepper/ui/booking-stepper.tsx](../../../widgets/booking-stepper/ui/booking-stepper.tsx)**

- [ ] **Step 2: Add a test asserting the chrome is glass**

- [ ] **Step 3: Confirm fail**

- [ ] **Step 4: Wrap the outer element in `<GlassSurface tint="cool" blur="md" elevation={1}>`**. Preserve all segment rendering inside.

  **Widget-test provider note:** if adding new tests, wrap with `NextIntlClientProvider` per the pattern in [vitest.setup.ts](../../../vitest.setup.ts) and the nearest existing widget test.

- [ ] **Step 5: Verify the segment fill animation**. Look for `scaleX` on the active/filled segment using Motion. If absent, add a `motion.div` with `style={{ scaleX, transformOrigin: 'left' }}` driven by a derived `MotionValue` from progress.

- [ ] **Step 6: Pass + lint + commit**

  ```bash
  git add widgets/booking-stepper
  git commit -m "feat(widgets/booking-stepper): glass chrome + segment scaleX"
  ```

---

## Task 13 — `<TonightStrip />` glass ribbon

**Files:**
- Modify: `widgets/tonight-strip/ui/tonight-strip.tsx`

- [ ] **Step 1: Read [widgets/tonight-strip/ui/tonight-strip.tsx](../../../widgets/tonight-strip/ui/tonight-strip.tsx)**

- [ ] **Step 2: Add a test asserting the ribbon's root is a GlassSurface**

- [ ] **Step 3: Implement** — wrap the outer ribbon `<div>` in `<GlassSurface tint="warm" blur="md" elevation={1}>`. The inner `<Marquee />` stays unchanged.

  **Widget-test provider note:** if adding new tests, wrap with `NextIntlClientProvider` per the pattern in [vitest.setup.ts](../../../vitest.setup.ts) and the nearest existing widget test.

- [ ] **Step 4: Pass + lint + commit**

  ```bash
  git add widgets/tonight-strip
  git commit -m "feat(widgets/tonight-strip): glass ribbon"
  ```

---

## Task 14 — Playwright E2E specs

**Files:**
- Create: `e2e/liquid-glass-chrome.spec.ts`
- Create: `e2e/sheet-glass.spec.ts`

- [ ] **Step 0: Locate the palette-attribute target before writing the palette test**

  ```bash
  grep -rn "data-palette" --include="*.tsx" --include="*.ts" .
  ```

  Confirm the live palette switcher writes `data-palette="..."` on `document.documentElement` (the [app/globals.css](../../../app/globals.css) selectors use `:root[data-palette="..."]`, so that's where it must be set). If the codebase writes the attribute somewhere else (e.g. `<body>` or a context provider only), update the Playwright `addInitScript` accordingly. If the palette switcher mechanism is unclear, **drop the palette portion of the spec for this PR** — palette QA is already deferred per spec §0, and a fake-passing test is worse than no test.

- [ ] **Step 1: Write `liquid-glass-chrome.spec.ts`**

  ```ts
  import { test, expect } from "@playwright/test";

  test.describe("Liquid glass chrome", () => {
    test("app header and tab bar render with data-glass on /home", async ({ page }) => {
      await page.goto("/en/home");
      await expect(page.locator("header[data-glass='true']")).toBeVisible();
      await expect(page.locator("nav[aria-label] [data-glass='true']")).toBeVisible();
    });

    test("renders on Mono and Obsidian palettes", async ({ page }) => {
      for (const palette of ["mono", "obsidian"]) {
        await page.addInitScript((p) => {
          document.documentElement.setAttribute("data-palette", p);
        }, palette);
        await page.goto("/en/home");
        // Verify the palette attribute actually reached the DOM —
        // otherwise the test silently passes without exercising the palette.
        await expect(page.locator("html")).toHaveAttribute("data-palette", palette);
        await expect(page.locator("header[data-glass='true']")).toBeVisible();
      }
    });
  });
  ```

- [ ] **Step 2: Write `sheet-glass.spec.ts`**

  ```ts
  import { test, expect } from "@playwright/test";

  test.describe("Sheet glass body", () => {
    test("nav-sheet opens with a glass body", async ({ page }) => {
      await page.goto("/en/home");
      const menuTrigger = page.locator("button[aria-label*='Menu' i]").first();
      if (await menuTrigger.count()) {
        await menuTrigger.click();
        await expect(page.locator("[role='dialog'][data-glass='true']")).toBeVisible();
      } else {
        test.skip(true, "no menu trigger on /home — sheet test pending nav-sheet wiring");
      }
    });
  });
  ```

- [ ] **Step 3: Run e2e**

  Stop any local `next dev` first (Next.js 16 single-dev-server rule). Then:
  ```bash
  npm run e2e -- --grep "Liquid|Sheet"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add e2e/liquid-glass-chrome.spec.ts e2e/sheet-glass.spec.ts
  git commit -m "test(liquid-glass): E2E specs for chrome and sheet glass"
  ```

---

## Task 15 — PR notes and Lighthouse before/after

**Files:**
- Modify: spec acceptance addendum (optional — add Lighthouse table to PR body, not committed to the repo as such)

- [ ] **Step 1: Run Lighthouse on `/en/welcome`, `/en/home`, `/en/services/[any]`, `/en/booking/when` before deploying**

  Use `npm run dev`, then run a Lighthouse mobile audit (Chrome DevTools or `lighthouse` CLI). Record the four sets of numbers.

- [ ] **Step 2: Compare against the current `develop` baseline**

  Check out `develop` in a fresh worktree (use [superpowers:using-git-worktrees](../../../.claude/plugins/cache/claude-plugins-official/superpowers/5.0.5/skills/using-git-worktrees/)). Ensure baseline parity:

  - Same Node version as the feature worktree (check `.nvmrc` or `package.json` engines)
  - Run `npm ci` from a clean state (not `npm install`) so the lockfile resolves identically
  - Same dev-server flags, same browser profile, same network throttling for Lighthouse
  - Clean tabs / no other dev servers running (Next.js 16 single-dev-server constraint also reduces system noise)

  Run the four Lighthouse audits on `/en/welcome`, `/en/home`, `/en/services/[any]`, `/en/booking/when`. Record. Diff the LCP / INP / CLS / TBT numbers against the feature worktree's audit.

- [ ] **Step 3: Open the PR with a table**

  Use the [pr-description](../../../.claude/skills/pr-description/SKILL.md) project skill. Body includes:
  - Summary of the foundation pass (link to spec)
  - Lighthouse before/after table for the four routes
  - Screenshots: chrome on Aubergine / Mono / Obsidian
  - Notes on reduced-transparency + reduced-motion manual verification
  - Out-of-scope list (referencing spec §9)

- [ ] **Step 4: If any LCP regressed >100 ms, stop and tune**

  If a route regressed, the most likely cause is the `blur-xl` AppHeader or `blur-2xl` TabBar. Mitigation options: drop AppHeader to `blur-lg`, drop TabBar to `blur-xl`, or apply `content-visibility: auto` to off-screen surfaces (Phase 1 §14 already does this for aurora). Re-run Lighthouse, document the trade-off in the PR.

- [ ] **Step 5: Push and open PR**

  ```bash
  git push -u origin feature/liquid-glass-foundation
  gh pr create --base develop --title "feat: liquid-glass foundation" --body "$(cat <<'EOF'
  …rich body per pr-description skill…
  EOF
  )"
  ```

---

## After all tasks complete

- [ ] **Run the full project suite once more**

  ```bash
  npm run lint && npm test && npm run build-storybook && npm run e2e
  ```

  All green.

- [ ] **Verify the husky `pre-push` build hook**

  The `git push -u origin ...` step in Task 15 will trigger it. If it fails, diagnose (don't `--no-verify`).

- [ ] **Take screenshots in three palettes**

  Required for PR per spec §10.

- [ ] **Confirm `prefers-reduced-transparency` and `prefers-reduced-motion` modes**

  macOS: System Settings → Accessibility → Display → "Reduce transparency" / "Reduce motion". Boot the dev server, walk the same four routes, screenshot any chrome surface. Confirm fallbacks render as solid surfaces with no blur and no animations.

— end of plan —
