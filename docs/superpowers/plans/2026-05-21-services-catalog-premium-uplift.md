# Services Catalog Premium Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the established Atelier vocabulary to `views/services-catalog` + `entities/service/ui/service-menu-item.tsx` per [docs/superpowers/specs/2026-05-21-services-catalog-premium-uplift-design.md](../specs/2026-05-21-services-catalog-premium-uplift-design.md). No new primitives — pure application of PR #31's design system.

**Architecture:** Three file edits in the view (`services-catalog-page.tsx`, `category-chips.tsx`) and the entity (`service-menu-item.tsx`). Story refreshed. Existing tests preserved; one new `CategoryChips` chip-styling test added.

**Tech Stack:** unchanged from PR #31.

**Test contracts that MUST be preserved:**
- `service-menu-item.test.tsx`: name, blurb, `€{price}`, `{duration} · {category}` regex, plate text "02"/"12", `border-t-[0.5px]` for topRule.
- `services-catalog-page.test.tsx`: H1 "The menu.", 6 H3s by default, tab role + aria-selected, `/services/signature` link, plate "01"/"02"/"03" within articles after Care filter.

---

## File Structure

**Modified**
- `views/services-catalog/ui/services-catalog-page.tsx`
- `views/services-catalog/ui/category-chips.tsx`
- `entities/service/ui/service-menu-item.tsx`
- `entities/service/ui/service-menu-item.stories.tsx`

**Possibly modified (only if existing assertion changes)**
- `entities/service/ui/service-menu-item.test.tsx`

**Net new**
- `views/services-catalog/ui/category-chips.test.tsx` (new — covers the styling contract added in this PR)

---

## Task 1: `ServiceMenuItem` premium treatment

**Files:**
- Modify: `entities/service/ui/service-menu-item.tsx`

- [ ] **Step 1: Update the component**

Apply:
1. Wrap `NailTile` thumbnail in a `.gilded .glass-top` outer div, preserving the same height/width.
2. Replace the dotted `border-b-[0.5px] border-dotted border-line-strong` divider between plate number and name with a `LetterpressRule` (import from `@/shared/ui/letterpress-rule`).
3. Promote the plate number: keep the text "01"/"02"/etc (tests rely on it) but render in `font-display text-[18px] italic text-gold` instead of `font-mono text-[9px] text-accent`. Wrap in a `<span>` (not a heading) to keep the existing single-token children semantics.
4. Wrap `€{price}` in a `.gilded` rounded-full pill (`px-2.5 py-0.5`). Keep the existing text-gold class on the inner span. The pill becomes the outer container.
5. Add `motion-reduce:hover:translate-x-0` next to the existing `hover:translate-x-1`.

Implementation:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { NailTile, type NailTileVariant } from "@/shared/ui/nail-tile";
import type { Service } from "@/entities/studio";

export interface ServiceMenuItemProps extends HTMLAttributes<HTMLElement> {
  service: Service;
  plateNumber: number;
  variant?: NailTileVariant;
  palette?: readonly [string, string];
  topRule?: boolean;
}

const DEFAULT_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

export function ServiceMenuItem({
  service,
  plateNumber,
  variant = 0,
  palette = DEFAULT_PALETTE,
  topRule = false,
  className,
  ...rest
}: ServiceMenuItemProps) {
  const padded = String(plateNumber).padStart(2, "0");
  return (
    <article
      className={cn(
        "group/menu border-b-[0.5px] border-line-strong py-[22px] transition-transform duration-fast ease-out",
        topRule && "border-t-[0.5px]",
        "hover:translate-x-1 motion-reduce:hover:translate-x-0",
        className,
      )}
      {...rest}
    >
      <div className="flex items-start gap-4">
        <div className="gilded glass-top h-[98px] w-[78px] shrink-0 overflow-hidden rounded-lg">
          <NailTile palette={palette} variant={variant} className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[18px] italic leading-none tracking-[-0.02em] text-gold">
              {padded}
            </span>
            <LetterpressRule className="mb-1 flex-1" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[28px] font-normal italic leading-[1.05] tracking-[-0.01em]">
              {service.name}
            </h3>
            <span className="gilded inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5">
              <span className="font-mono text-[14px] text-gold">
                €{service.price}
              </span>
            </span>
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
            {service.duration} · {service.category}
          </div>
          <p className="mt-2.5 text-[13px] leading-[1.5] text-text-2">
            {service.blurb}
          </p>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run entities/service
npm run lint
```
Expected: existing 3 ServiceMenuItem tests pass. If the plate-number assertions fail because of the new `getByText("02")` matching multiple elements, we'll narrow the query — but they should pass because the padded number is now a single `<span>` with that text.

- [ ] **Step 3: Commit**

```bash
git add entities/service/ui/service-menu-item.tsx
git commit -m "feat(entities/service/menu-item): gilded thumb, gold folio plate, foil price pill"
```

---

## Task 2: `CategoryChips` chip styling

**Files:**
- Modify: `views/services-catalog/ui/category-chips.tsx`
- Create: `views/services-catalog/ui/category-chips.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// views/services-catalog/ui/category-chips.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryChips } from "./category-chips";

describe("CategoryChips", () => {
  const args = {
    categories: ["All", "Care", "Gel"] as const,
    labels: { All: "All", Care: "Care", Gel: "Gel" },
    ariaLabel: "Filter",
    onChange: vi.fn(),
  };

  it("renders the selected chip with the gold foil styling", () => {
    render(<CategoryChips {...args} active="Care" />);
    const careChip = screen.getByRole("tab", { name: "Care" });
    expect(careChip).toHaveAttribute("aria-selected", "true");
    expect(careChip).toHaveClass("bg-gold");
  });

  it("renders unselected chips with the gilded gold-hairline border", () => {
    render(<CategoryChips {...args} active="Care" />);
    const gelChip = screen.getByRole("tab", { name: "Gel" });
    expect(gelChip).toHaveAttribute("aria-selected", "false");
    expect(gelChip).toHaveClass("gilded");
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `npx vitest run views/services-catalog/ui/category-chips.test.tsx`
Expected: FAIL — current selected chip uses `bg-text`, not `bg-gold`; unselected uses `border-line-strong`, not `gilded`.

- [ ] **Step 3: Update the component**

Replace the body of `category-chips.tsx` with:

```tsx
"use client";

import { cn } from "@/shared/lib/cn";

export type ChipValue = "All" | string;

export interface CategoryChipsProps {
  categories: readonly ChipValue[];
  active: ChipValue;
  onChange: (value: ChipValue) => void;
  labels: Record<string, string>;
  ariaLabel: string;
}

const baseChip =
  "shrink-0 rounded-full px-4 py-[9px] font-mono text-[11px] font-medium uppercase tracking-[0.16em] transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const selectedChip =
  "bg-gold text-bg bg-[length:200%_100%] bg-[position:0%_50%] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]";

const unselectedChip = "gilded text-text-2 hover:text-text";

export function CategoryChips({
  categories,
  active,
  onChange,
  labels,
  ariaLabel,
}: CategoryChipsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="scroll-x flex gap-2 overflow-x-auto px-[22px] pb-1.5 pt-[18px]"
    >
      {categories.map((value) => {
        const selected = value === active;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(value)}
            className={cn(baseChip, selected ? selectedChip : unselectedChip)}
          >
            {labels[value] ?? value}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test + lint**

Run:
```
npx vitest run views/services-catalog
npm run lint
```
Expected: PASS — the two new chip tests + the existing page tests.

- [ ] **Step 5: Commit**

```bash
git add views/services-catalog/ui/category-chips.tsx views/services-catalog/ui/category-chips.test.tsx
git commit -m "feat(views/services-catalog/chips): gilded unselected, foil-stamp selected"
```

---

## Task 3: `services-catalog-page.tsx` masthead premium treatment

**Files:**
- Modify: `views/services-catalog/ui/services-catalog-page.tsx`

- [ ] **Step 1: Update the page**

Apply:
1. Add imports: `LetterpressRule`, `Ornament`, `PaperGrain`, `Plate`.
2. Wrap the hero `<section>` in a relative container hosting `<PaperGrain />` (z-0), lift content via `relative z-10`.
3. Replace the two-column eyebrow row with a `Plate folio` (`number={0}` rendered as "00", `label={t("plate_alacarte").toUpperCase()}`) and put the existing "06 Rituals" tag (`t("plate_rituals")`) right-aligned beside it.
4. Add a `LetterpressRule` between the title and paragraph.
5. Apply `.dropcap` to the lead `<p>`.
6. In the empty state, replace the bare `<p>` with `<Ornament />` above and `font-display italic` styling on the message.
7. Keep `hover:translate-x-1` on the wrapping `<Link>` (already there in CSS via ServiceMenuItem; the Link itself is unchanged — only an additive `motion-reduce` modifier on the underlying card was applied in Task 1).

Implementation:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServiceMenuItem } from "@/entities/service";
import { STUDIO_DATA, type Category } from "@/entities/studio";
import { AppHeader } from "@/widgets/app-header";
import { TabBar } from "@/widgets/tab-bar";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import type { NailTileVariant } from "@/shared/ui/nail-tile";
import { Ornament } from "@/shared/ui/ornament";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { Plate } from "@/shared/ui/plate";
import { CategoryChips, type ChipValue } from "./category-chips";

const CATEGORIES: readonly Category[] = ["Care", "Gel", "Design", "Form"];

export function ServicesCatalogPage() {
  const t = useTranslations("Services");
  const tCat = useTranslations("Services.category");
  const [active, setActive] = useState<ChipValue>("All");

  const chips: readonly ChipValue[] = useMemo(() => ["All", ...CATEGORIES], []);
  const labels = useMemo<Record<string, string>>(
    () => ({
      All: t("category_all"),
      Care: tCat("Care"),
      Gel: tCat("Gel"),
      Design: tCat("Design"),
      Form: tCat("Form"),
    }),
    [t, tCat],
  );

  const filtered = useMemo(
    () =>
      active === "All"
        ? STUDIO_DATA.services
        : STUDIO_DATA.services.filter((s) => s.category === active),
    [active],
  );

  return (
    <div className="pb-28">
      <AppHeader />

      <section className="relative overflow-hidden px-[22px] pb-[18px] pt-3">
        <PaperGrain />
        <div className="relative z-10">
          <div className="flex items-end justify-between">
            <Plate folio number={0} label={t("plate_alacarte").toUpperCase()} />
            <span className="pb-2 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
              {t("plate_rituals")}
            </span>
          </div>
          <h1 className="mt-3 font-display text-[56px] font-light italic leading-[0.95] tracking-[-0.025em]">
            {t("hero_title")}
          </h1>
          <LetterpressRule className="mt-3.5 max-w-[260px]" />
          <p className="dropcap mt-4 max-w-[320px] text-[14px] text-text-2">
            {t("hero_paragraph")}
          </p>
        </div>
      </section>

      <CategoryChips
        categories={chips}
        active={active}
        onChange={setActive}
        labels={labels}
        ariaLabel={t("filter_aria")}
      />

      <div className="px-[22px] pb-7 pt-[22px]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Ornament className="mx-auto max-w-[160px]" />
            <p className="mt-6 font-display text-[18px] italic text-text-2">
              {t("empty")}
            </p>
          </div>
        ) : (
          filtered.map((service, i) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className="block transition-transform duration-fast ease-out"
            >
              <ServiceMenuItem
                service={service}
                plateNumber={i + 1}
                variant={(i % 6) as NailTileVariant}
                topRule={i === 0}
              />
            </Link>
          ))
        )}
      </div>
      <TabBar />
    </div>
  );
}
```

- [ ] **Step 2: Run tests + lint**

Run:
```
npx vitest run views/services-catalog entities/service
npm run lint
```
Expected: all green (existing 5 page tests + 3 ServiceMenuItem tests + 2 new chip tests).

If the H1 test fails because of the masthead change, re-check: the `<h1>` content is the existing `t("hero_title")` ("The menu.") so the test should still pass.

- [ ] **Step 3: Commit**

```bash
git add views/services-catalog/ui/services-catalog-page.tsx
git commit -m "feat(views/services-catalog): folio masthead, paper grain, dropcap, ornamented empty"
```

---

## Task 4: Refresh `ServiceMenuItem` story

**Files:**
- Modify: `entities/service/ui/service-menu-item.stories.tsx`

- [ ] **Step 1: Update story description**

Change the docs description to reflect the new visual treatment:

```tsx
docs: {
  description: {
    component:
      "Catalog-row layout used on /services. Gilded nail-tile thumbnail, gold folio plate number, hanging letterpress rule, italic title, and a gilded foil-stamp price pill. Hover translates 4px right (no-op with reduced motion).",
  },
},
```

- [ ] **Step 2: Run storybook tests + lint**

Run:
```
npm test
npm run lint
```
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add entities/service/ui/service-menu-item.stories.tsx
git commit -m "docs(entities/service/menu-item): refresh story description"
```

---

## Task 5: Full verification gate

- [ ] `npm run lint` — 0 errors
- [ ] `npm test` — all tests pass; expected total ≥ 264 (existing 262 + 2 new CategoryChips tests)
- [ ] `npm run build` — 87 pages generate successfully
- [ ] `npm run build-storybook` — static Storybook builds successfully

---

## Task 6: Open PR

- [ ] Push branch: `git push -u origin feat/services-catalog-premium-uplift`
- [ ] Open PR with `pr-description` skill against `develop`.
- [ ] Return URL to user.

---

## Rollback

Single revert of merge commit. No data/env/migration changes.
