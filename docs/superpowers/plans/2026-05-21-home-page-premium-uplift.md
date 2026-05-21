# Home Page Premium Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Atelier" premium design vocabulary to `views/home` per the spec at [docs/superpowers/specs/2026-05-21-home-page-premium-uplift-design.md](../specs/2026-05-21-home-page-premium-uplift-design.md). Establish the shared primitives (paper grain, letterpress rule, monogram seal, drop cap / gilded / glass-top utilities, Plate folio, foil-stamp button) that subsequent page PRs reuse.

**Architecture:** Three new `shared/ui/` slices (`paper-grain`, `letterpress-rule`, `monogram-seal`) following FSD canonical shape (index.ts + ui/component.tsx + ui/component.stories.tsx + ui/component.test.tsx). One additive prop on `Plate` (`folio`). Three new CSS utility classes in `app/globals.css` (`.gilded`, `.glass-top`, `.dropcap`). Inner-shadow refinement to existing `Button.gold` variant. All 8 sections of `views/home/ui/sections/*` updated to consume the new primitives/utilities. No IA, copy, palette, or i18n changes.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 (via `@tailwindcss/postcss`) · TypeScript strict · `next-intl` · `next-themes` · `motion/react` · Vitest + Testing Library · Storybook (`@storybook/nextjs-vite`)

**Conventions to honor:**
- FSD layering — only `views/home` imports new `shared/ui` primitives in this PR
- Public API via `index.ts`; never deep-import `ui/*.tsx`
- Every new `shared/ui` slice ships a Storybook story AND a Vitest test (per the `new-ui-component` project skill)
- Tailwind tokens come from `@theme` in `app/globals.css`; do not edit tokens — add utility classes only
- All decorative additions use `aria-hidden="true"` and `role="presentation"` where applicable
- Husky pre-commit runs `lint` + `test`; pre-push runs `build`. Don't `--no-verify`.

---

## File Structure

**New files**
- `shared/ui/paper-grain/index.ts`
- `shared/ui/paper-grain/ui/paper-grain.tsx`
- `shared/ui/paper-grain/ui/paper-grain.stories.tsx`
- `shared/ui/paper-grain/ui/paper-grain.test.tsx`
- `shared/ui/letterpress-rule/index.ts`
- `shared/ui/letterpress-rule/ui/letterpress-rule.tsx`
- `shared/ui/letterpress-rule/ui/letterpress-rule.stories.tsx`
- `shared/ui/letterpress-rule/ui/letterpress-rule.test.tsx`
- `shared/ui/monogram-seal/index.ts`
- `shared/ui/monogram-seal/ui/monogram-seal.tsx`
- `shared/ui/monogram-seal/ui/monogram-seal.stories.tsx`
- `shared/ui/monogram-seal/ui/monogram-seal.test.tsx`

**Modified files**
- `app/globals.css` — append `.gilded`, `.glass-top`, `.dropcap` utility classes
- `shared/ui/plate/ui/plate.tsx` — add `folio?: boolean` prop
- `shared/ui/plate/ui/plate.stories.tsx` — add `Folio` story
- `shared/ui/plate/ui/plate.test.tsx` — add folio rendering test
- `shared/ui/button/ui/button.tsx` — refine `gold` variant inner shadows (additive class string)
- `views/home/ui/sections/home-hero.tsx`
- `views/home/ui/sections/announcement-capsule.tsx`
- `views/home/ui/sections/signatures-list.tsx`
- `views/home/ui/sections/master-strip.tsx`
- `views/home/ui/sections/gallery-strip.tsx`
- `views/home/ui/sections/testimonial-card.tsx`
- `views/home/ui/sections/membership-card.tsx`
- `views/home/ui/sections/home-footer.tsx`

**Untouched**
- `app/[locale]/home/page.tsx`, `views/home/index.ts`, `views/home/ui/home-page.tsx` (composition is unchanged)
- `messages/*.json`, `i18n/*`, `proxy.ts`
- `@theme` tokens, palette overrides

---

## Task 1: New primitive — `PaperGrain`

**Files:**
- Create: `shared/ui/paper-grain/ui/paper-grain.test.tsx`
- Create: `shared/ui/paper-grain/ui/paper-grain.tsx`
- Create: `shared/ui/paper-grain/ui/paper-grain.stories.tsx`
- Create: `shared/ui/paper-grain/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/paper-grain/ui/paper-grain.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PaperGrain } from "./paper-grain";

describe("PaperGrain", () => {
  it("renders as a decorative overlay (aria-hidden, presentation)", () => {
    const { container } = render(<PaperGrain />);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.getAttribute("role")).toBe("presentation");
  });

  it("is non-interactive (pointer-events: none)", () => {
    const { container } = render(<PaperGrain />);
    expect(container.firstChild).toHaveClass("pointer-events-none");
  });

  it("merges an incoming className", () => {
    const { container } = render(<PaperGrain className="opacity-50" />);
    expect(container.firstChild).toHaveClass("opacity-50");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/paper-grain/ui/paper-grain.test.tsx`
Expected: FAIL — "Cannot find module './paper-grain'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// shared/ui/paper-grain/ui/paper-grain.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type PaperGrainProps = HTMLAttributes<HTMLDivElement>;

// Tiny SVG noise turbulence baked as a data URI so no network request fires.
// fractalNoise + 4 octaves gives a fine paper-stock grain. opacity is tuned low.
const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function PaperGrain({ className, style, ...rest }: PaperGrainProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] opacity-[0.035] mix-blend-overlay",
        className,
      )}
      style={{ backgroundImage: NOISE_SVG, backgroundSize: "160px 160px", ...style }}
      {...rest}
    />
  );
}
```

- [ ] **Step 4: Write the story**

```tsx
// shared/ui/paper-grain/ui/paper-grain.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PaperGrain } from "./paper-grain";

const meta: Meta<typeof PaperGrain> = {
  title: "shared/ui/PaperGrain",
  component: PaperGrain,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof PaperGrain>;

export const Default: Story = {
  render: () => (
    <div className="relative h-72 w-96 overflow-hidden rounded-lg bg-bg">
      <PaperGrain />
      <div className="relative z-10 p-6 font-display text-2xl italic text-text">
        Atelier paper stock.
      </div>
    </div>
  ),
};

export const HighOpacity: Story = {
  render: () => (
    <div className="relative h-72 w-96 overflow-hidden rounded-lg bg-bg">
      <PaperGrain className="opacity-30" />
    </div>
  ),
};
```

- [ ] **Step 5: Write the public API barrel**

```ts
// shared/ui/paper-grain/index.ts
export { PaperGrain } from "./ui/paper-grain";
export type { PaperGrainProps } from "./ui/paper-grain";
```

- [ ] **Step 6: Run test to verify pass + lint**

Run:
```
npx vitest run shared/ui/paper-grain/ui/paper-grain.test.tsx
npm run lint
```
Expected: PASS, no eslint errors.

- [ ] **Step 7: Commit**

```bash
git add shared/ui/paper-grain
git commit -m "feat(shared/ui): PaperGrain decorative noise overlay"
```

---

## Task 2: New primitive — `LetterpressRule`

**Files:**
- Create: `shared/ui/letterpress-rule/ui/letterpress-rule.test.tsx`
- Create: `shared/ui/letterpress-rule/ui/letterpress-rule.tsx`
- Create: `shared/ui/letterpress-rule/ui/letterpress-rule.stories.tsx`
- Create: `shared/ui/letterpress-rule/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/letterpress-rule/ui/letterpress-rule.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LetterpressRule } from "./letterpress-rule";

describe("LetterpressRule", () => {
  it("renders as a presentational decorative element", () => {
    render(<LetterpressRule />);
    expect(
      screen.getByRole("presentation", { hidden: true }),
    ).toBeInTheDocument();
  });

  it("merges incoming className", () => {
    const { container } = render(<LetterpressRule className="my-4" />);
    expect(container.firstChild).toHaveClass("my-4");
  });

  it("renders a thin (1px) horizontal element", () => {
    const { container } = render(<LetterpressRule />);
    expect(container.firstChild).toHaveClass("h-px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/letterpress-rule/ui/letterpress-rule.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// shared/ui/letterpress-rule/ui/letterpress-rule.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type LetterpressRuleProps = HTMLAttributes<HTMLDivElement>;

export function LetterpressRule({ className, style, ...rest }: LetterpressRuleProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("h-px w-full", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-accent) 60%, transparent) 22%, var(--color-accent) 50%, color-mix(in oklab, var(--color-accent) 60%, transparent) 78%, transparent)",
        ...style,
      }}
      {...rest}
    />
  );
}
```

- [ ] **Step 4: Write the story**

```tsx
// shared/ui/letterpress-rule/ui/letterpress-rule.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LetterpressRule } from "./letterpress-rule";

const meta: Meta<typeof LetterpressRule> = {
  title: "shared/ui/LetterpressRule",
  component: LetterpressRule,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof LetterpressRule>;

export const Default: Story = {
  render: () => (
    <div className="w-96 bg-bg p-6">
      <div className="font-display text-3xl italic text-text">Signatures.</div>
      <LetterpressRule className="mt-3" />
    </div>
  ),
};
```

- [ ] **Step 5: Write the public API barrel**

```ts
// shared/ui/letterpress-rule/index.ts
export { LetterpressRule } from "./ui/letterpress-rule";
export type { LetterpressRuleProps } from "./ui/letterpress-rule";
```

- [ ] **Step 6: Run test + lint**

Run:
```
npx vitest run shared/ui/letterpress-rule/ui/letterpress-rule.test.tsx
npm run lint
```
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add shared/ui/letterpress-rule
git commit -m "feat(shared/ui): LetterpressRule gold-falloff hairline"
```

---

## Task 3: New primitive — `MonogramSeal`

**Files:**
- Create: `shared/ui/monogram-seal/ui/monogram-seal.test.tsx`
- Create: `shared/ui/monogram-seal/ui/monogram-seal.tsx`
- Create: `shared/ui/monogram-seal/ui/monogram-seal.stories.tsx`
- Create: `shared/ui/monogram-seal/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/monogram-seal/ui/monogram-seal.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonogramSeal } from "./monogram-seal";

describe("MonogramSeal", () => {
  it("renders as a decorative seal (aria-hidden, presentation)", () => {
    render(<MonogramSeal letter="V" />);
    expect(
      screen.getByRole("presentation", { hidden: true }),
    ).toBeInTheDocument();
  });

  it("renders the provided letter", () => {
    const { container } = render(<MonogramSeal letter="V" />);
    expect(container.textContent).toContain("V");
  });

  it("merges incoming className on the outer ring", () => {
    const { container } = render(<MonogramSeal letter="V" className="size-10" />);
    expect(container.firstChild).toHaveClass("size-10");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/monogram-seal/ui/monogram-seal.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// shared/ui/monogram-seal/ui/monogram-seal.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface MonogramSealProps extends HTMLAttributes<HTMLSpanElement> {
  letter: string;
}

export function MonogramSeal({ letter, className, ...rest }: MonogramSealProps) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full border border-accent/60",
        "font-display text-[14px] italic leading-none",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.3)]",
        className,
      )}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--color-accent-2) 70%, transparent), color-mix(in oklab, var(--color-accent) 35%, transparent) 65%, transparent)",
      }}
      {...rest}
    >
      <span className="text-gold">{letter}</span>
    </span>
  );
}
```

- [ ] **Step 4: Write the story**

```tsx
// shared/ui/monogram-seal/ui/monogram-seal.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonogramSeal } from "./monogram-seal";

const meta: Meta<typeof MonogramSeal> = {
  title: "shared/ui/MonogramSeal",
  component: MonogramSeal,
  tags: ["autodocs"],
  args: { letter: "V" },
  argTypes: { letter: { control: "text" } },
};
export default meta;
type Story = StoryObj<typeof MonogramSeal>;

export const Default: Story = {};
export const Large: Story = { args: { className: "size-12 text-[24px]" } };
```

- [ ] **Step 5: Write the public API barrel**

```ts
// shared/ui/monogram-seal/index.ts
export { MonogramSeal } from "./ui/monogram-seal";
export type { MonogramSealProps } from "./ui/monogram-seal";
```

- [ ] **Step 6: Run test + lint**

Run:
```
npx vitest run shared/ui/monogram-seal/ui/monogram-seal.test.tsx
npm run lint
```
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add shared/ui/monogram-seal
git commit -m "feat(shared/ui): MonogramSeal gold cabochon"
```

---

## Task 4: Extend `Plate` with `folio` prop

**Files:**
- Modify: `shared/ui/plate/ui/plate.tsx`
- Modify: `shared/ui/plate/ui/plate.test.tsx`
- Modify: `shared/ui/plate/ui/plate.stories.tsx`

- [ ] **Step 1: Add the failing test**

Append to `shared/ui/plate/ui/plate.test.tsx`:

```tsx
  it("renders a large folio numeral when folio is true", () => {
    const { container } = render(<Plate number={2} label="THE MENU" folio />);
    // The padded numeral 02 should appear inside a font-display element
    const display = container.querySelector(".font-display");
    expect(display?.textContent).toContain("02");
    // Eyebrow label is still rendered
    expect(screen.getByText(/THE MENU/)).toBeInTheDocument();
  });

  it("does not render a folio numeral by default", () => {
    const { container } = render(<Plate number={2} label="THE MENU" />);
    expect(container.querySelector(".font-display")).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/plate/ui/plate.test.tsx`
Expected: FAIL — folio test fails (no `.font-display` element)

- [ ] **Step 3: Implement folio branch**

Replace the body of `shared/ui/plate/ui/plate.tsx` with:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";

export interface PlateProps extends HTMLAttributes<HTMLSpanElement> {
  number: number;
  label?: string;
  folio?: boolean;
}

export function Plate({ number, label, folio = false, className, ...rest }: PlateProps) {
  const padded = number.toString().padStart(2, "0");

  if (folio) {
    return (
      <div className={cn("flex items-end gap-3", className)} {...rest}>
        <span className="font-display text-[72px] italic leading-[0.85] tracking-[-0.04em] text-gold">
          {padded}
        </span>
        <Eyebrow className="pb-2">
          PLATE {padded}
          {label ? ` · ${label}` : ""}
        </Eyebrow>
      </div>
    );
  }

  return (
    <Eyebrow className={cn(className)} {...rest}>
      PLATE {padded}
      {label ? ` · ${label}` : ""}
    </Eyebrow>
  );
}
```

- [ ] **Step 4: Add a Folio story**

Append to `shared/ui/plate/ui/plate.stories.tsx`:

```tsx
export const Folio: Story = { args: { folio: true, number: 2, label: "THE MENU" } };
```

- [ ] **Step 5: Run test + lint**

Run:
```
npx vitest run shared/ui/plate/ui/plate.test.tsx
npm run lint
```
Expected: PASS (4 tests now), no errors.

- [ ] **Step 6: Commit**

```bash
git add shared/ui/plate
git commit -m "feat(shared/ui/plate): folio variant with large gold numeral"
```

---

## Task 5: Add `.gilded`, `.glass-top`, `.dropcap` utility classes

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append utilities to globals.css**

Append to the bottom of `app/globals.css` (after the `@media (prefers-reduced-motion: reduce)` block):

```css
/* Atelier utilities — gilded borders, top-edge glass highlight, drop cap */

.gilded {
  border: 0.5px solid transparent;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image:
    linear-gradient(var(--color-surface), var(--color-surface)),
    var(--gold-grad);
}

.glass-top {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.25);
}

.dropcap::first-letter {
  font-family: var(--font-display);
  float: left;
  font-size: 56px;
  line-height: 0.85;
  margin-right: 8px;
  margin-top: 6px;
  background: var(--gold-grad);
  background-size: 200% 100%;
  background-position: 25% 50%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build 2>&1 | tail -20`
Expected: Successful Next.js build (no Tailwind CSS errors).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(globals): gilded border, glass-top inset, dropcap utilities"
```

---

## Task 6: Refine `Button.gold` with foil-stamp inner shadows

**Files:**
- Modify: `shared/ui/button/ui/button.tsx`

Note: existing test `applies gold variant styling` only checks for `bg-gold`, so it stays green. No new behavioural test needed — this is purely a visual refinement.

- [ ] **Step 1: Update the gold variant class string**

In `shared/ui/button/ui/button.tsx`, replace the `gold` entry in `variantClass`:

```ts
  gold: "bg-gold text-bg hover:[background-position:100%_50%] bg-[length:200%_100%] bg-[position:0%_50%] transition-[background-position] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]",
```

- [ ] **Step 2: Run button tests**

Run: `npx vitest run shared/ui/button/ui/button.test.tsx`
Expected: PASS (all 6 tests).

- [ ] **Step 3: Commit**

```bash
git add shared/ui/button
git commit -m "feat(shared/ui/button): foil-stamp inner shadow on gold variant"
```

---

## Task 7: Home — `home-hero.tsx` premium refinement

**Files:**
- Modify: `views/home/ui/sections/home-hero.tsx`

- [ ] **Step 1: Imports + paper-grain + dropcap + letterpress rule**

In `views/home/ui/sections/home-hero.tsx`:

a. Add imports near the existing imports:
```ts
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { PaperGrain } from "@/shared/ui/paper-grain";
```

b. Wrap the existing returned `<div className="relative">` so that `<PaperGrain />` is the first child (within the relative container, behind content).
```tsx
return (
  <div className="relative">
    <PaperGrain />
    {/* … existing motion.div etc */}
  </div>
);
```

c. After the `<h1>` (still inside `motion.div`), add a thin letterpress rule:
```tsx
<LetterpressRule className="mt-5 max-w-[260px]" />
```

d. Apply `.dropcap` to the lead `<p>`:
```tsx
<p className="dropcap mt-6 max-w-[320px] text-[14.5px] leading-[1.55] text-text-2">
  {t("hero_paragraph")}
</p>
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npm test
npm run lint
```
Expected: all 247 tests pass (245 baseline + 2 new Plate folio tests; PaperGrain/LetterpressRule/MonogramSeal each add 3 → +9, so total should be 245 + 2 + 9 = 256). No eslint errors.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/home-hero.tsx
git commit -m "feat(views/home/hero): paper grain, letterpress rule, drop cap"
```

---

## Task 8: Home — `announcement-capsule.tsx`

**Files:**
- Modify: `views/home/ui/sections/announcement-capsule.tsx`

- [ ] **Step 1: Apply gilded border + glass-top + live dot**

Replace the body of `announcement-capsule.tsx` with:

```tsx
import { useTranslations } from "next-intl";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function AnnouncementCapsule() {
  const t = useTranslations("Home");
  return (
    <div className="gilded glass-top relative mx-[22px] flex items-center gap-4 overflow-hidden rounded-[18px] px-[22px] py-[18px]">
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[3px] bg-gold" />
      <span
        aria-hidden
        className="absolute left-[10px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent animate-soft-pulse"
      />
      <div className="ml-3 min-w-0 flex-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-accent">
          {t("capsule_eyebrow")}
        </span>
        <div className="mt-1 font-display text-[19px] italic">{t("capsule_title")}</div>
      </div>
      <ArrowRight />
    </div>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/announcement-capsule.tsx
git commit -m "feat(views/home/capsule): gilded border, glass top, pulsing live dot"
```

---

## Task 9: Home — `signatures-list.tsx`

**Files:**
- Modify: `views/home/ui/sections/signatures-list.tsx`

- [ ] **Step 1: Folio plate + letterpress rule + hover micro-tilt**

Replace the body of `signatures-list.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServiceCard } from "@/entities/service";
import { STUDIO_DATA } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import type { NailTileVariant } from "@/shared/ui/nail-tile";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SignaturesList() {
  const t = useTranslations("Home");
  const services = STUDIO_DATA.services.slice(0, 4);
  return (
    <section className="px-[22px] pb-6 pt-12">
      <div className="mb-3 flex items-end justify-between">
        <Plate folio number={1} label={t("plate_menu").toUpperCase()} />
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent"
        >
          {t("signatures_all_link")} <ArrowRight />
        </Link>
      </div>
      <h2 className="mt-1 font-display text-[40px] font-normal italic leading-[1.05] tracking-[-0.02em]">
        {t("signatures_title")}
      </h2>
      <LetterpressRule className="mb-[22px] mt-3" />

      <div className="flex flex-col">
        {services.map((service, i) => (
          <Link
            key={service.id}
            href={`/services/${service.id}`}
            className="block transition-transform duration-fast ease-out hover:scale-[1.005] motion-reduce:hover:scale-100"
          >
            <ServiceCard
              service={service}
              variant={(i % 6) as NailTileVariant}
              topRule={i === 0}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home shared/ui/plate
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/signatures-list.tsx
git commit -m "feat(views/home/signatures): folio plate, letterpress rule, hover lift"
```

---

## Task 10: Home — `master-strip.tsx`

**Files:**
- Modify: `views/home/ui/sections/master-strip.tsx`

- [ ] **Step 1: Gilded border + concentric cabochon avatar**

Replace the body of `master-strip.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA } from "@/entities/studio";
import { Plate } from "@/shared/ui/plate";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function MasterStrip() {
  const t = useTranslations("Home");
  const { artist } = STUDIO_DATA;
  return (
    <section className="px-[22px] pb-4 pt-7">
      <Plate number={2} label={t("plate_master").toUpperCase()} />
      <Link
        href="/master"
        className="gilded glass-top mt-3.5 flex w-full items-center gap-[18px] overflow-hidden rounded-[28px] p-[18px] text-left text-text"
      >
        <span
          aria-hidden
          className="relative inline-flex size-[72px] shrink-0 items-center justify-center rounded-full border border-accent/60 p-[6px]"
        >
          <span
            className="block size-full rounded-full border border-accent/40"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #f3ead8 0%, var(--color-accent) 45%, var(--color-plum) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.35)",
            }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-accent">
            {t("master_stat")}
          </div>
          <div className="mt-1.5 font-display text-[24px] italic">{artist.name}</div>
          <p className="mt-1.5 text-xs italic leading-[1.5] text-text-2">
            &ldquo;{artist.quote}&rdquo;
          </p>
        </div>
        <ArrowRight />
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/master-strip.tsx
git commit -m "feat(views/home/master): gilded card, concentric lacquer avatar"
```

---

## Task 11: Home — `gallery-strip.tsx`

**Files:**
- Modify: `views/home/ui/sections/gallery-strip.tsx`

- [ ] **Step 1: Folio plate + gilded tile frames + hover tilt**

Replace the body of `gallery-strip.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STUDIO_DATA } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function GalleryStrip() {
  const t = useTranslations("Home");
  const items = STUDIO_DATA.gallery.slice(0, 5);
  return (
    <section className="pb-7 pt-5">
      <div className="mb-3 flex items-end justify-between px-[22px]">
        <div>
          <Plate folio number={4} label={t("plate_portfolio").toUpperCase()} />
          <h2 className="mt-2 font-display text-[34px] font-normal italic leading-[1.05] tracking-[-0.02em]">
            {t("gallery_title_a")} <em>{t("gallery_title_b")}</em>.
          </h2>
        </div>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent"
        >
          {t("gallery_view_all")} <ArrowRight />
        </Link>
      </div>
      <LetterpressRule className="mx-[22px] mb-4" />
      <div className="scroll-x flex gap-3 overflow-x-auto px-[22px] pb-2 snap-x snap-mandatory">
        {items.map((g, i) => (
          <Link
            key={g.id}
            href="/gallery"
            className="gilded relative h-[220px] w-[150px] shrink-0 snap-start overflow-hidden rounded-[18px] shadow-[0_12px_28px_-16px_rgba(0,0,0,0.55)] transition-transform duration-fast ease-out hover:-rotate-[0.4deg] hover:scale-[1.01] motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100"
          >
            <NailTile
              palette={g.palette}
              variant={((i + 1) % 6) as NailTileVariant}
              className="size-full"
            />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(20,9,26,0.45)] px-2 py-[3px] font-display text-[12px] italic text-text backdrop-blur-md">
              Nº {String(i + 1).padStart(2, "0")}
            </span>
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(20,9,26,0.55)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text backdrop-blur-md">
              {g.tag}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/gallery-strip.tsx
git commit -m "feat(views/home/gallery): folio plate, gilded tiles, hover tilt"
```

---

## Task 12: Home — `testimonial-card.tsx`

**Files:**
- Modify: `views/home/ui/sections/testimonial-card.tsx`

- [ ] **Step 1: Hanging quote + gilded glass card + letterpress rule**

Replace the body of `testimonial-card.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";

export function TestimonialCard() {
  const t = useTranslations("Home");
  const item = STUDIO_DATA.testimonials[0];
  return (
    <section className="px-[22px] py-7">
      <Plate number={3} label={t("plate_word").toUpperCase()} />
      <div
        className="gilded glass-top relative mt-4 overflow-hidden rounded-[28px] px-7 py-9"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-surface), var(--color-surface)), var(--gold-grad)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 top-1.5 select-none font-display text-[140px] font-light italic leading-none text-gold"
        >
          &ldquo;
        </div>
        <p className="m-0 mb-5 pl-12 font-display text-[26px] font-normal italic leading-[1.3]">
          {item.text}
        </p>
        <LetterpressRule className="mb-4 max-w-[200px]" />
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-7 rounded-full border-[0.5px] border-accent"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, var(--color-rose), var(--color-plum))",
            }}
          />
          <div>
            <div className="text-[13px] font-medium">{item.name}</div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
              {item.role}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/testimonial-card.tsx
git commit -m "feat(views/home/testimonial): hanging gold quote, gilded glass card"
```

---

## Task 13: Home — `membership-card.tsx`

**Files:**
- Modify: `views/home/ui/sections/membership-card.tsx`

- [ ] **Step 1: Gilded glass + monogram seal + dropcap**

Replace the body of `membership-card.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { Plate } from "@/shared/ui/plate";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function MembershipCard() {
  const t = useTranslations("Home");
  return (
    <section className="px-[22px] pb-7 pt-2.5">
      <Link
        href="/membership"
        className="gilded glass-top relative block w-full overflow-hidden rounded-[28px] px-[26px] py-8 text-left text-text"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[50px] -top-[50px] size-[220px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 28%, transparent), transparent 70%)",
          }}
        />
        <div className="absolute right-5 top-5">
          <MonogramSeal letter="V" />
        </div>
        <Plate number={5} label={t("plate_invitation").toUpperCase()} />
        <h3 className="my-3 font-display text-[32px] font-normal italic leading-tight tracking-[-0.01em]">
          {t("membership_title_lead")}{" "}
          <span className="text-gold-shimmer">{t("membership_title_word")}</span>.
        </h3>
        <p className="dropcap m-0 max-w-[300px] text-[13.5px] leading-[1.55] text-text-2">
          {t("membership_blurb")}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          {t("membership_link")} <ArrowRight />
        </div>
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/membership-card.tsx
git commit -m "feat(views/home/membership): gilded glass card, monogram seal, drop cap"
```

---

## Task 14: Home — `home-footer.tsx`

**Files:**
- Modify: `views/home/ui/sections/home-footer.tsx`

- [ ] **Step 1: Add monogram seal above wordmark**

Replace the body of `home-footer.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { MonogramSeal } from "@/shared/ui/monogram-seal";
import { Ornament } from "@/shared/ui/ornament";

export function HomeFooter() {
  const t = useTranslations("Home");
  return (
    <footer className="px-[22px] pb-7 pt-10 text-center text-text-3">
      <Ornament />
      <div className="mt-6 flex flex-col items-center gap-3">
        <MonogramSeal letter="V" className="size-10 text-[20px]" />
        <div className="font-display text-[22px] font-light italic">Violetta.</div>
      </div>
      <div className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.32em]">
        {STUDIO_DATA.studio.address}
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.32em]">
        {t("footer_copyright")}
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/home
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add views/home/ui/sections/home-footer.tsx
git commit -m "feat(views/home/footer): monogram seal above wordmark"
```

---

## Task 15: Full verification gate

- [ ] **Step 1: Full vitest run**

Run: `npm test 2>&1 | tail -20`
Expected: All test files pass. Tests count = 245 baseline + 2 (plate folio) + 3 (paper-grain) + 3 (letterpress-rule) + 3 (monogram-seal) = **256**.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors, no warnings.

- [ ] **Step 3: Production build**

Run: `npm run build 2>&1 | tail -40`
Expected: Next build completes; no Tailwind/PostCSS errors; bundle stats printed.

- [ ] **Step 4: Storybook build**

Run: `npm run build-storybook 2>&1 | tail -10`
Expected: Static Storybook builds successfully (validates all new stories render).

- [ ] **Step 5: Capture verification output**

Save the trimmed output from steps 1-4 — paste it verbatim into the PR body.

---

## Task 16: Open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/home-premium-uplift
```

- [ ] **Step 2: Use `pr-description` skill to draft + open PR**

Invoke the `pr-description` project skill. Title should be under 70 chars, e.g.:
`feat(views/home): premium "Atelier" uplift`

Body includes:
- Summary bullets (paper grain, gilded borders, glass top, letterpress rule, drop cap, foil-stamp button, folio plate, monogram seal — per-section list)
- Verification output (from Task 15 Step 5)
- Screenshots/notes from manual smoke (optional, if dev server was started locally)
- Test plan checklist (visit `/en/home`, `/ru/home`, `/be/home`; toggle palette; toggle reduced motion)
- Link to spec: `docs/superpowers/specs/2026-05-21-home-page-premium-uplift-design.md`

- [ ] **Step 3: Return PR URL**

Capture the URL printed by `gh pr create` and return it to the user as the deliverable for this page.

---

## Rollback

Single revert of the merge commit cleans the entire change set; no data migrations, env vars, or feature flags involved.
