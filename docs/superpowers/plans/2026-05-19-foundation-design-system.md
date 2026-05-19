# Foundation Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation layer (utility helpers, data types + stub content, presentational primitives) so subsequent plans can assemble screens from these building blocks. No motion, no routing, no business logic — just typed shape + Tailwind primitives.

**Architecture:** Two new FSD slices — `shared/lib/cn` (className helper) and `entities/studio` (data types + stub `STUDIO_DATA`). Five new presentational primitives in `shared/ui/` (Wordmark, Eyebrow, Plate, Ornament, Tag) and an upgrade to the existing `shared/ui/button` to match the spec's variant set. Every primitive follows `@.claude/skills/new-ui-component/SKILL.md` exactly: Tailwind only, mandatory Storybook story, mandatory Vitest test, public API via `index.ts`.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, TypeScript strict, Vitest + Testing Library + jsdom, Storybook (`@storybook/nextjs-vite`) with `@storybook/addon-vitest` exercising every story as a browser test, Husky pre-commit (lint + test) and pre-push (build).

**Spec source of truth:** [`docs/handsoff/start.md`](../../handsoff/start.md) §2 (tokens — already ported), §5.1 (primitives), §7 (data shape), §9 (a11y/polish).

**Branch:** All work happens on `feature/foundation-design-system` off `develop`. The branch is opened as a PR into `develop` when every task is green.

---

## Setup (before Task 1)

- [ ] **Step 1: Verify clean working tree on `develop`**
  ```bash
  git status
  git branch --show-current
  ```
  Expected: clean tree, branch is `develop`.

- [ ] **Step 2: Cut feature branch**
  ```bash
  git checkout -b feature/foundation-design-system
  ```

---

## File structure (locked in before any task)

Created:
- `shared/lib/cn/index.ts` — `cn()` helper (clsx + tailwind-merge)
- `shared/lib/cn/cn.test.ts` — unit tests
- `entities/studio/index.ts` — public API
- `entities/studio/model/types.ts` — `Service`, `GalleryItem`, `MembershipTier`, `Category`, `GalleryTag`
- `entities/studio/model/data.ts` — stub `STUDIO_DATA` (clearly TODO-marked content; replaced when the prototype HTML lands)
- `shared/ui/wordmark/{index.ts,ui/wordmark.tsx,ui/wordmark.stories.tsx,ui/wordmark.test.tsx}`
- `shared/ui/eyebrow/{index.ts,ui/eyebrow.tsx,ui/eyebrow.stories.tsx,ui/eyebrow.test.tsx}`
- `shared/ui/plate/{index.ts,ui/plate.tsx,ui/plate.stories.tsx,ui/plate.test.tsx}`
- `shared/ui/ornament/{index.ts,ui/ornament.tsx,ui/ornament.stories.tsx,ui/ornament.test.tsx}`
- `shared/ui/tag/{index.ts,ui/tag.tsx,ui/tag.stories.tsx,ui/tag.test.tsx}`

Modified:
- `shared/ui/button/ui/button.tsx` — variant set becomes `solid | gold | outline | ghost`; adds `block?: boolean` and `icon?: ReactNode`
- `shared/ui/button/ui/button.stories.tsx` — replace existing variant stories; add `Gold`, `Block`, `WithIcon`, regenerate `AllVariants`
- `shared/ui/button/ui/button.test.tsx` — cover new variants + `block` + `icon`

`StatusBar` and `Wordmark.accent` from the spec are scoped out:
- `StatusBar` — spec §9 says "**Delete it in production**." Don't build.
- `Wordmark.accent` prop — defer until Welcome screen (next plan) actually needs it. YAGNI.

---

## Task 1: `cn()` helper

`cn()` is `clsx(...).concat then tailwind-merge`. Every primitive will use it to merge incoming `className` with internal classes without producing conflicting Tailwind utilities (e.g. caller passing `p-2` should override the component's `p-4`).

**Files:**
- Create: `shared/lib/cn/index.ts`
- Test: `shared/lib/cn/cn.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// shared/lib/cn/cn.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "./index";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("merges conflicting Tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays and conditional objects (clsx behavior)", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run shared/lib/cn/cn.test.ts
```
Expected: FAIL — module `./index` not found.

- [ ] **Step 3: Implement**

```ts
// shared/lib/cn/index.ts
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run shared/lib/cn/cn.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/lib/cn
git commit -m "feat(shared/lib): add cn() className helper"
```

The pre-commit hook runs `npm run lint` and `npm test` — both must pass.

---

## Task 2: Data types + stub `STUDIO_DATA`

The prototype's `STUDIO_DATA` isn't in the repo yet; we stub minimal content so screens can render. The shape is final (locked by spec §7); the values are placeholders flagged in code.

**Files:**
- Create: `entities/studio/model/types.ts`
- Create: `entities/studio/model/data.ts`
- Create: `entities/studio/index.ts`
- Create: `entities/studio/model/data.test.ts` (validates the stub against the types and basic invariants)

- [ ] **Step 1: Write types**

```ts
// entities/studio/model/types.ts
export type Category = "Care" | "Gel" | "Design" | "Form";

export type GalleryTag =
  | "Editorial"
  | "Gel"
  | "Chrome"
  | "Lace"
  | "Bridal";

export type MembershipTierName = "Petale" | "Violette" | "Atelier";

export interface Service {
  id: string;
  name: string;
  category: Category;
  duration: string; // "75 min"
  price: number;   // 95
  blurb: string;
  includes: string[];
  hero: string;    // future image key
}

export interface GalleryItem {
  id: string;
  tag: GalleryTag;
  palette: readonly [string, string]; // [hero, deep] hex colors
  h: number;                          // masonry height (220–300)
}

export interface MembershipTier {
  tier: MembershipTierName;
  price: number;
  cadence: string;
  perks: string[];
  featured: boolean;
}
```

- [ ] **Step 2: Write the failing data test**

```ts
// entities/studio/model/data.test.ts
import { describe, it, expect } from "vitest";
import { STUDIO_DATA } from "./data";

describe("STUDIO_DATA", () => {
  it("has at least one service in every category", () => {
    const categories = new Set(STUDIO_DATA.services.map((s) => s.category));
    expect(categories).toEqual(new Set(["Care", "Gel", "Design", "Form"]));
  });

  it("service ids are unique", () => {
    const ids = STUDIO_DATA.services.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 3 membership tiers in the canonical order", () => {
    expect(STUDIO_DATA.membership.map((m) => m.tier)).toEqual([
      "Petale",
      "Violette",
      "Atelier",
    ]);
  });

  it("exactly one membership tier is featured", () => {
    expect(STUDIO_DATA.membership.filter((m) => m.featured)).toHaveLength(1);
  });

  it("gallery item heights are within the masonry range (220–300)", () => {
    for (const item of STUDIO_DATA.gallery) {
      expect(item.h).toBeGreaterThanOrEqual(220);
      expect(item.h).toBeLessThanOrEqual(300);
    }
  });
});
```

- [ ] **Step 3: Run test, expect FAIL** (`./data` doesn't exist)

```bash
npx vitest run entities/studio/model/data.test.ts
```

- [ ] **Step 4: Implement stub data**

```ts
// entities/studio/model/data.ts
// TODO: replace with STUDIO_DATA extracted from `Violetta Beauty.html`
// prototype's `src/components.jsx`. Shape is final; content is placeholder.

import type { GalleryItem, MembershipTier, Service } from "./types";

const services: Service[] = [
  {
    id: "care-classic",
    name: "Classic Care",
    category: "Care",
    duration: "60 min",
    price: 65,
    blurb: "Shape, cuticle, and a quiet hand polish.",
    includes: ["File and shape", "Cuticle care", "Hand massage", "Polish"],
    hero: "care-classic",
  },
  {
    id: "gel-signature",
    name: "Signature Gel",
    category: "Gel",
    duration: "75 min",
    price: 95,
    blurb: "Long-wear gel with a museum-grade finish.",
    includes: ["Prep and shape", "Gel base", "2 colour coats", "Top seal"],
    hero: "gel-signature",
  },
  {
    id: "design-couture",
    name: "Couture Design",
    category: "Design",
    duration: "120 min",
    price: 180,
    blurb: "Hand-painted accents, foils, or chrome.",
    includes: ["Consultation", "Hand-painted accents", "Foil or chrome"],
    hero: "design-couture",
  },
  {
    id: "form-extension",
    name: "Form Extension",
    category: "Form",
    duration: "150 min",
    price: 220,
    blurb: "Sculpted extensions with a structural finish.",
    includes: ["Form prep", "Sculpted apex", "Refined finish"],
    hero: "form-extension",
  },
];

const gallery: GalleryItem[] = [
  { id: "g1", tag: "Editorial", palette: ["#7d3a6f", "#100612"], h: 280 },
  { id: "g2", tag: "Gel", palette: ["#c9a96e", "#1f0e25"], h: 240 },
  { id: "g3", tag: "Chrome", palette: ["#e8cf99", "#2a1432"], h: 260 },
  { id: "g4", tag: "Lace", palette: ["#d9a3b6", "#18091c"], h: 220 },
  { id: "g5", tag: "Bridal", palette: ["#fff5d6", "#100612"], h: 300 },
  { id: "g6", tag: "Editorial", palette: ["#9d7bc7", "#18091c"], h: 240 },
];

const membership: MembershipTier[] = [
  {
    tier: "Petale",
    price: 60,
    cadence: "per month",
    perks: ["One signature gel per month", "Booking priority"],
    featured: false,
  },
  {
    tier: "Violette",
    price: 120,
    cadence: "per month",
    perks: [
      "Two signature gels per month",
      "10% off design upgrades",
      "Booking priority",
    ],
    featured: true,
  },
  {
    tier: "Atelier",
    price: 220,
    cadence: "per month",
    perks: [
      "Unlimited care + 2 design sessions",
      "Early access to new finishes",
      "Companion treatment per quarter",
    ],
    featured: false,
  },
];

export const STUDIO_DATA = {
  services,
  gallery,
  membership,
} as const;
```

- [ ] **Step 5: Public API**

```ts
// entities/studio/index.ts
export { STUDIO_DATA } from "./model/data";
export type {
  Service,
  GalleryItem,
  MembershipTier,
  Category,
  GalleryTag,
  MembershipTierName,
} from "./model/types";
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npx vitest run entities/studio/model/data.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add entities/studio
git commit -m "feat(entities/studio): add data types and stub STUDIO_DATA"
```

---

## Task 3: `Wordmark` primitive

Spec §5.1: "Violetta BEAUTY" lockup. `size?` prop for scale. Display font (Cormorant Garamond, italic) on the word, mono (JetBrains Mono) caps on the "BEAUTY" subline with `.text-gold` styling for now (animated `.text-gold-shimmer` belongs to the Welcome screen plan, not here — YAGNI for the foundation).

**Files:**
- Create: `shared/ui/wordmark/ui/wordmark.tsx`
- Create: `shared/ui/wordmark/ui/wordmark.stories.tsx`
- Create: `shared/ui/wordmark/ui/wordmark.test.tsx`
- Create: `shared/ui/wordmark/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/wordmark/ui/wordmark.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("renders the brand name and subline", () => {
    render(<Wordmark />);
    expect(screen.getByText("Violetta")).toBeInTheDocument();
    expect(screen.getByText(/BEAUTY/i)).toBeInTheDocument();
  });

  it("applies size sm utility classes when size='sm'", () => {
    const { container } = render(<Wordmark size="sm" />);
    expect(container.firstChild).toHaveClass("text-3xl");
  });

  it("applies size lg utility classes when size='lg'", () => {
    const { container } = render(<Wordmark size="lg" />);
    expect(container.firstChild).toHaveClass("text-7xl");
  });

  it("merges incoming className without dropping internal ones", () => {
    const { container } = render(<Wordmark className="opacity-50" />);
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(container.firstChild).toHaveClass("font-display");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npx vitest run shared/ui/wordmark/ui/wordmark.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// shared/ui/wordmark/ui/wordmark.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Size = "sm" | "md" | "lg";

export interface WordmarkProps extends HTMLAttributes<HTMLDivElement> {
  size?: Size;
}

const sizeClass: Record<Size, string> = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl",
};

export function Wordmark({ size = "md", className, ...rest }: WordmarkProps) {
  return (
    <div
      className={cn("font-display italic leading-none", sizeClass[size], className)}
      {...rest}
    >
      <span className="block">Violetta</span>
      <span className="block font-mono not-italic tracking-[0.32em] text-[0.18em] mt-2 text-gold">
        B·E·A·U·T·Y
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npx vitest run shared/ui/wordmark/ui/wordmark.test.tsx
```

- [ ] **Step 5: Story**

```tsx
// shared/ui/wordmark/ui/wordmark.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmark } from "./wordmark";

const meta: Meta<typeof Wordmark> = {
  title: "shared/ui/Wordmark",
  component: Wordmark,
  tags: ["autodocs"],
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { backgrounds: { default: "aubergine" } },
};
export default meta;
type Story = StoryObj<typeof Wordmark>;

export const Medium: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8 items-start">
      <Wordmark size="sm" />
      <Wordmark size="md" />
      <Wordmark size="lg" />
    </div>
  ),
};
```

- [ ] **Step 6: Public API**

```ts
// shared/ui/wordmark/index.ts
export { Wordmark } from "./ui/wordmark";
export type { WordmarkProps } from "./ui/wordmark";
```

- [ ] **Step 7: Run all tests (unit + storybook), expect PASS**

```bash
npm test
```
Expected: all green. Wordmark stories appear in the storybook browser project as additional tests.

- [ ] **Step 8: Commit**

```bash
git add shared/ui/wordmark
git commit -m "feat(shared/ui): add Wordmark primitive"
```

---

## Task 4: `Eyebrow` primitive

Mono caps label. `gold?` prop applies the `.text-gold` helper. 9–10px, letter-spacing 0.32em. Used by `Plate` (Task 5).

**Files:**
- Create: `shared/ui/eyebrow/{ui/eyebrow.tsx, ui/eyebrow.stories.tsx, ui/eyebrow.test.tsx, index.ts}`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/eyebrow/ui/eyebrow.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Eyebrow } from "./eyebrow";

describe("Eyebrow", () => {
  it("renders children inside a mono-styled element", () => {
    const { container } = render(<Eyebrow>Plate 02</Eyebrow>);
    expect(screen.getByText("Plate 02")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("font-mono");
    expect(container.firstChild).toHaveClass("uppercase");
  });

  it("does not apply text-gold by default", () => {
    const { container } = render(<Eyebrow>Plate 02</Eyebrow>);
    expect(container.firstChild).not.toHaveClass("text-gold");
  });

  it("applies text-gold when gold prop is set", () => {
    const { container } = render(<Eyebrow gold>Plate 02</Eyebrow>);
    expect(container.firstChild).toHaveClass("text-gold");
  });

  it("merges incoming className", () => {
    const { container } = render(<Eyebrow className="mb-4">x</Eyebrow>);
    expect(container.firstChild).toHaveClass("mb-4");
    expect(container.firstChild).toHaveClass("font-mono");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npx vitest run shared/ui/eyebrow/ui/eyebrow.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// shared/ui/eyebrow/ui/eyebrow.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  gold?: boolean;
}

export function Eyebrow({ gold, className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn(
        "font-mono uppercase text-[10px] tracking-[0.32em] text-text-2 leading-none",
        gold && "text-gold",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npx vitest run shared/ui/eyebrow/ui/eyebrow.test.tsx
```

- [ ] **Step 5: Story**

```tsx
// shared/ui/eyebrow/ui/eyebrow.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Eyebrow } from "./eyebrow";

const meta: Meta<typeof Eyebrow> = {
  title: "shared/ui/Eyebrow",
  component: Eyebrow,
  tags: ["autodocs"],
  args: { children: "PLATE 02 · THE MENU" },
  argTypes: { gold: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof Eyebrow>;

export const Default: Story = {};
export const Gold: Story = { args: { gold: true } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-start">
      <Eyebrow>VOL · No 12 · ATELIER</Eyebrow>
      <Eyebrow gold>SIGNATURE · GEL</Eyebrow>
    </div>
  ),
};
```

- [ ] **Step 6: Public API**

```ts
// shared/ui/eyebrow/index.ts
export { Eyebrow } from "./ui/eyebrow";
export type { EyebrowProps } from "./ui/eyebrow";
```

- [ ] **Step 7: Run all tests, expect PASS**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add shared/ui/eyebrow
git commit -m "feat(shared/ui): add Eyebrow primitive"
```

---

## Task 5: `Plate` primitive

Composes Eyebrow. "PLATE 02 · THE MENU" pattern. Props: `number: number`, `label?: string`.

**Files:**
- Create: `shared/ui/plate/{ui/plate.tsx, ui/plate.stories.tsx, ui/plate.test.tsx, index.ts}`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/plate/ui/plate.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Plate } from "./plate";

describe("Plate", () => {
  it("renders the plate marker with zero-padded number", () => {
    render(<Plate number={2} label="THE MENU" />);
    expect(screen.getByText(/PLATE 02/)).toBeInTheDocument();
    expect(screen.getByText(/THE MENU/)).toBeInTheDocument();
  });

  it("zero-pads single digits and leaves double digits alone", () => {
    const { rerender } = render(<Plate number={1} />);
    expect(screen.getByText(/PLATE 01/)).toBeInTheDocument();
    rerender(<Plate number={12} />);
    expect(screen.getByText(/PLATE 12/)).toBeInTheDocument();
  });

  it("omits the separator and label when label is absent", () => {
    render(<Plate number={3} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npx vitest run shared/ui/plate/ui/plate.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// shared/ui/plate/ui/plate.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";

export interface PlateProps extends HTMLAttributes<HTMLSpanElement> {
  number: number;
  label?: string;
}

export function Plate({ number, label, className, ...rest }: PlateProps) {
  const padded = number.toString().padStart(2, "0");
  return (
    <Eyebrow className={cn(className)} {...rest}>
      PLATE {padded}
      {label ? ` · ${label}` : ""}
    </Eyebrow>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npx vitest run shared/ui/plate/ui/plate.test.tsx
```

- [ ] **Step 5: Story**

```tsx
// shared/ui/plate/ui/plate.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plate } from "./plate";

const meta: Meta<typeof Plate> = {
  title: "shared/ui/Plate",
  component: Plate,
  tags: ["autodocs"],
  args: { number: 2, label: "THE MENU" },
  argTypes: { number: { control: "number" }, label: { control: "text" } },
};
export default meta;
type Story = StoryObj<typeof Plate>;

export const Default: Story = {};
export const NumberOnly: Story = { args: { label: undefined } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 items-start">
      <Plate number={1} label="WELCOME" />
      <Plate number={2} label="THE MENU" />
      <Plate number={12} />
    </div>
  ),
};
```

- [ ] **Step 6: Public API**

```ts
// shared/ui/plate/index.ts
export { Plate } from "./ui/plate";
export type { PlateProps } from "./ui/plate";
```

- [ ] **Step 7: Run all tests, expect PASS**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add shared/ui/plate
git commit -m "feat(shared/ui): add Plate primitive"
```

---

## Task 6: `Ornament` primitive

Hairline rule with a center diamond. No props beyond standard HTML attrs. Purely decorative — `role="presentation"`.

**Files:**
- Create: `shared/ui/ornament/{ui/ornament.tsx, ui/ornament.stories.tsx, ui/ornament.test.tsx, index.ts}`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/ornament/ui/ornament.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ornament } from "./ornament";

describe("Ornament", () => {
  it("renders with presentation role (decorative only)", () => {
    render(<Ornament />);
    expect(screen.getByRole("presentation")).toBeInTheDocument();
  });

  it("merges incoming className", () => {
    const { container } = render(<Ornament className="my-8" />);
    expect(container.firstChild).toHaveClass("my-8");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npx vitest run shared/ui/ornament/ui/ornament.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// shared/ui/ornament/ui/ornament.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type OrnamentProps = HTMLAttributes<HTMLDivElement>;

export function Ornament({ className, ...rest }: OrnamentProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("flex items-center gap-3 text-text-3", className)}
      {...rest}
    >
      <span className="flex-1 h-px bg-line" />
      <span className="size-1.5 rotate-45 bg-accent" />
      <span className="flex-1 h-px bg-line" />
    </div>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npx vitest run shared/ui/ornament/ui/ornament.test.tsx
```

- [ ] **Step 5: Story**

```tsx
// shared/ui/ornament/ui/ornament.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Ornament } from "./ornament";

const meta: Meta<typeof Ornament> = {
  title: "shared/ui/Ornament",
  component: Ornament,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Ornament>;

export const Default: Story = {
  render: () => (
    <div className="w-96 p-6">
      <Ornament />
    </div>
  ),
};
```

- [ ] **Step 6: Public API**

```ts
// shared/ui/ornament/index.ts
export { Ornament } from "./ui/ornament";
export type { OrnamentProps } from "./ui/ornament";
```

- [ ] **Step 7: Run all tests, expect PASS**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add shared/ui/ornament
git commit -m "feat(shared/ui): add Ornament primitive"
```

---

## Task 7: `Tag` primitive

Pill chip, mono caps. `gold?` and `active?` props. 11px, letter-spacing 0.16em.

**Files:**
- Create: `shared/ui/tag/{ui/tag.tsx, ui/tag.stories.tsx, ui/tag.test.tsx, index.ts}`

- [ ] **Step 1: Write the failing test**

```tsx
// shared/ui/tag/ui/tag.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tag } from "./tag";

describe("Tag", () => {
  it("renders children with mono caps styling", () => {
    const { container } = render(<Tag>Editorial</Tag>);
    expect(screen.getByText("Editorial")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("font-mono");
    expect(container.firstChild).toHaveClass("uppercase");
  });

  it("does not apply gold or active styling by default", () => {
    const { container } = render(<Tag>Editorial</Tag>);
    expect(container.firstChild).not.toHaveClass("text-gold");
    expect(container.firstChild).not.toHaveClass("bg-surface-2");
  });

  it("applies gold class when gold prop is set", () => {
    const { container } = render(<Tag gold>Editorial</Tag>);
    expect(container.firstChild).toHaveClass("text-gold");
  });

  it("applies active styling when active prop is set", () => {
    const { container } = render(<Tag active>Editorial</Tag>);
    expect(container.firstChild).toHaveClass("bg-surface-2");
    expect(container.firstChild).toHaveClass("text-text");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npx vitest run shared/ui/tag/ui/tag.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// shared/ui/tag/ui/tag.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  gold?: boolean;
  active?: boolean;
}

export function Tag({ gold, active, className, children, ...rest }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono uppercase text-[11px] tracking-[0.16em]",
        "rounded-full px-3 py-1 border border-line text-text-2 leading-none",
        active && "bg-surface-2 text-text border-line-strong",
        gold && "text-gold",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npx vitest run shared/ui/tag/ui/tag.test.tsx
```

- [ ] **Step 5: Story**

```tsx
// shared/ui/tag/ui/tag.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tag } from "./tag";

const meta: Meta<typeof Tag> = {
  title: "shared/ui/Tag",
  component: Tag,
  tags: ["autodocs"],
  args: { children: "Editorial" },
  argTypes: {
    gold: { control: "boolean" },
    active: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const Gold: Story = { args: { gold: true } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag>All</Tag>
      <Tag active>Editorial</Tag>
      <Tag>Gel</Tag>
      <Tag gold>Featured</Tag>
    </div>
  ),
};
```

- [ ] **Step 6: Public API**

```ts
// shared/ui/tag/index.ts
export { Tag } from "./ui/tag";
export type { TagProps } from "./ui/tag";
```

- [ ] **Step 7: Run all tests, expect PASS**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add shared/ui/tag
git commit -m "feat(shared/ui): add Tag primitive"
```

---

## Task 8: Upgrade `Button` to match spec variant set

Existing button has `primary | secondary | ghost` and `sm | md | lg`. Spec §5.1 requires `solid | gold | outline | ghost` plus `block?` and `icon?`. Since no consumers reference Button yet (verified by grep at start of step 1), the rename is safe.

**Files:**
- Modify: `shared/ui/button/ui/button.tsx`
- Modify: `shared/ui/button/ui/button.stories.tsx`
- Modify: `shared/ui/button/ui/button.test.tsx`

- [ ] **Step 1: Confirm no external consumers exist**

```bash
grep -rln "from \"@/shared/ui/button\"" . --include="*.tsx" --include="*.ts" | grep -v node_modules
```
Expected: only files within `shared/ui/button/` itself. If anything else appears, stop and re-plan — a rename would break consumers.

- [ ] **Step 2: Rewrite the test for the new variant set + new props**

```tsx
// shared/ui/button/ui/button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children and is clickable", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Press</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies gold variant styling", () => {
    render(<Button variant="gold">Reserve</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-gold");
  });

  it("applies outline variant styling", () => {
    render(<Button variant="outline">More</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("renders full-width when block is true", () => {
    render(<Button block>Full</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("renders an icon node before children when icon prop is set", () => {
    render(
      <Button icon={<svg data-testid="ic" aria-hidden />}>Save</Button>,
    );
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run, expect FAIL** (current Button doesn't have these variants or props)

```bash
npx vitest run shared/ui/button/ui/button.test.tsx
```

- [ ] **Step 4: Rewrite Button**

```tsx
// shared/ui/button/ui/button.tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "solid" | "gold" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  solid: "bg-text text-bg hover:bg-text/90",
  gold: "bg-gold text-bg hover:[background-position:100%_50%] bg-[length:200%_100%] bg-[position:0%_50%] transition-[background-position]",
  outline: "border border-line-strong text-text hover:bg-surface/60",
  ghost: "bg-transparent text-text hover:bg-surface/40",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-7 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "solid",
    size = "md",
    block = false,
    icon,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium leading-none",
        "transition-colors disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        variantClass[variant],
        sizeClass[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
```

- [ ] **Step 5: Run, expect PASS**

```bash
npx vitest run shared/ui/button/ui/button.test.tsx
```

- [ ] **Step 6: Rewrite stories**

```tsx
// shared/ui/button/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "shared/ui/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["solid", "gold", "outline", "ghost"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    block: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { children: "Reserve a chair" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Solid: Story = { args: { variant: "solid" } };
export const Gold: Story = { args: { variant: "gold" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Block: Story = { args: { block: true, variant: "gold" } };
export const WithIcon: Story = {
  args: {
    icon: (
      <span aria-hidden className="size-1.5 rotate-45 bg-current" />
    ),
  },
};
export const Disabled: Story = { args: { disabled: true, variant: "gold" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="solid">Solid</Button>
      <Button variant="gold">Gold</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="gold" size="sm">Small</Button>
      <Button variant="gold" size="lg">Large</Button>
      <Button variant="gold" disabled>Disabled</Button>
      <div className="w-80"><Button variant="gold" block>Block</Button></div>
    </div>
  ),
};
```

- [ ] **Step 7: Run all tests, expect PASS**

```bash
npm test
```
Expected: all unit + storybook tests green.

- [ ] **Step 8: Commit**

```bash
git add shared/ui/button
git commit -m "refactor(shared/ui/button): align variants with spec (solid|gold|outline|ghost)"
```

---

## Task 9: Final verification + push + PR

- [ ] **Step 1: Full build to catch type errors not surfaced by lint/test**

```bash
rm -rf .next && npm run build
```
Expected: clean build with the three locale routes pre-rendered.

- [ ] **Step 2: Storybook static build**

```bash
npm run build-storybook
```
Expected: green, all primitive stories included.

- [ ] **Step 3: Push the branch (pre-push hook will re-run build)**

```bash
git push -u origin feature/foundation-design-system
```

- [ ] **Step 4: Open PR using `pr-description` skill**

Follow `@.claude/skills/pr-description/SKILL.md`. PR target is `develop`, not `main`. Title:

```
feat(shared): foundation design system (utilities, types, primitives)
```

Body sections: Summary, Why, Changes, Test plan (lint + unit + storybook + build all green), no Screenshots (no screens yet).

Return the PR URL.

---

## Out of scope (covered by later plans)

- NailTile / NailFan imagery (Plan 2)
- Route groups, AppHeader, TabBar (Plan 3)
- All screens (Plans 4–7)
- Motion choreography — Welcome letter-by-letter reveal, parallax, shared-element transitions
- Replacing stub `STUDIO_DATA` with prototype content
- Light theme (none in spec)
- `StatusBar` (spec says delete in production)

## Notes for the executor

- Pre-commit hook runs `npm run lint && npm test`. A failed hook means the commit didn't happen — never `--amend` to recover, never `--no-verify` to bypass. Fix the underlying issue and re-commit.
- Every primitive is presentational. No `useState`, no `useEffect`, no event handlers beyond what HTML attrs already provide. If a task tempts you toward client-side state, stop — that belongs in a feature slice, not in `shared/ui/`.
- `cn()` is the only acceptable way to merge className. Don't string-concatenate.
- Each commit must independently pass `npm run lint && npm test`. Don't accumulate broken state.
- The skill `@.claude/skills/new-ui-component/SKILL.md` is the canonical pattern — re-read it before each primitive task if anything feels ambiguous.
