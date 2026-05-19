---
name: new-ui-component
description: Add a new reusable UI component. Use when creating any presentational component. Enforces FSD placement, Tailwind styling, mandatory Storybook story, and mandatory Vitest unit test.
---

This project uses Feature-Sliced Design (FSD). Reusable UI components live in `shared/ui/`. Feature-bound components live in their feature slice (`features/<name>/ui/`). Pick the right home first — putting a button in a feature is wrong; putting a `LoginForm` in `shared/ui/` is also wrong.

## Step 0 — Check for an existing component first

Before creating anything, search:

```bash
ls shared/ui/                                              # primitives
grep -ril "<keyword>" shared/ui features widgets entities  # likely matches
```

If a similar component exists, **extend or compose it** instead of duplicating. Add a `variant` or new prop rather than a new component. Only create a new one when the existing component would have to be twisted to fit (different DOM, different a11y role, fundamentally different concept).

## Where it goes

| Component type | Location |
|---|---|
| Generic primitive reused across the app (Button, Input, Card, Dialog) | `shared/ui/<name>/` |
| Bound to a specific feature's logic (LoginForm, ThemeSwitcher) | `features/<feature>/ui/` |
| Larger composition combining features + entities | `widgets/<name>/ui/` |

## Required structure (shared/ui example)

```
shared/ui/<name>/
├── index.ts                   ← public API (re-exports)
└── ui/
    ├── <name>.tsx             ← component
    ├── <name>.stories.tsx     ← Storybook story (REQUIRED)
    └── <name>.test.tsx        ← Vitest test (REQUIRED)
```

Reference implementation: `shared/ui/button/` (at the repo root) — copy its shape.

## Styling — Tailwind only

- Use Tailwind utility classes directly on the JSX. No `styled-components`, no CSS modules, no inline `style` for visual styling.
- Dark mode: use the `dark:` variant. The `dark` class is set by `next-themes` on `<html>`.
- For variant-driven className composition, keep the per-variant strings in plain `Record<Variant, string>` objects (see Button). Don't pull in `clsx`/`cva` until you have 3+ components that genuinely need them — YAGNI.
- The component must respect `className` from props (`...rest` + concatenate).

## Required: Storybook story

```tsx
// <name>.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { <Name> } from "./<name>";

const meta: Meta<typeof <Name>> = {
  title: "shared/ui/<Name>",        // or "features/<feature>/<Name>", etc.
  component: <Name>,
  tags: ["autodocs"],
  argTypes: {
    // declare each prop with a control type
  },
  args: { /* sensible defaults */ },
};
export default meta;
type Story = StoryObj<typeof <Name>>;

export const Default: Story = {};
// One story per meaningful variant/state, then an AllVariants render story.
```

Rules:
- `title` mirrors the file location: `shared/ui/<Name>` / `features/<feature>/<Name>` / `widgets/<Name>`.
- Always `tags: ["autodocs"]`.
- Cover: default, every visual variant, disabled / loading / error states when applicable, and an `AllVariants` render story when there are 2+ variants.
- If the component needs translations or theme context, add a Storybook decorator — do **not** hard-code text in JSX you also have in `messages/*.json`.

Verify: `npm run storybook` shows the story; the addon-a11y panel has no violations.

## Required: Vitest unit test

```tsx
// <name>.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { <Name> } from "./<name>";

describe("<Name>", () => {
  it("renders ...", () => { /* ... */ });
  // + one test per behavior: interaction, prop variants that change behavior, a11y attrs
});
```

Cover at minimum:
- Renders with default props
- Each interactive behavior (click, keyboard, focus)
- Disabled / error states behave correctly (e.g. `disabled` blocks `onClick`)

Do **not** snapshot-test visuals — that's what stories + Chromatic are for.

Verify: `npm test` passes; the new test file shows up in the run.

## Public API

`index.ts` re-exports only what consumers need:

```ts
export { <Name> } from "./ui/<name>";
export type { <Name>Props } from "./ui/<name>";
```

Consumers import from the slice root: `import { Button } from "@/shared/ui/button"`. Never from `@/shared/ui/button/ui/button` — that breaks the FSD public API contract.

## Checklist (don't skip)

- [ ] Searched for an existing component; this one is genuinely new
- [ ] Placed in the correct FSD layer
- [ ] Tailwind only, no other styling solution
- [ ] `className` prop is respected
- [ ] Dark mode covered (`dark:` variants where colors are used)
- [ ] `.stories.tsx` exists with Default + every variant + `AllVariants`
- [ ] `.test.tsx` exists and covers default render + interactions + disabled/error
- [ ] `index.ts` re-exports component + types
- [ ] `npm run lint && npm test && npm run build-storybook` all green
