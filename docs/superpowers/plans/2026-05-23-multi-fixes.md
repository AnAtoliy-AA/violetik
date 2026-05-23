# Multi-fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 7 polish items as separate commits on `feature/multi-fixes`: welcome flame, master photo, global Arcadeum footer, admin palette live-preview, default-locale regression test, app-wide locale switcher, and `be → by` locale rename.

**Architecture:** FSD-clean — new `widgets/site-footer/` slice for the credit, refactor of `features/locale-switcher` from raw `<select>` into a pill control with `header`/`welcome` size variants, and an `i18n/LOCALE_TO_LANG` map that keeps internal locale ids (`by`) decoupled from valid BCP-47 tags (`be-BY`) emitted by `<html lang>` / hreflang. The `be → by` rename lands last as one atomic commit that includes a `0013_rename_be_to_by.sql` data migration, a Drizzle snapshot regeneration, a 308 redirect, and an inbound NEXT_LOCALE cookie rewrite in `proxy.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, next-intl, next-themes, Drizzle Postgres, Vitest + Testing Library + jsdom, Playwright, Storybook.

**Spec:** [docs/superpowers/specs/2026-05-23-multi-fixes-design.md](../specs/2026-05-23-multi-fixes-design.md)

**Branch:** `feature/multi-fixes` (already created from `develop`; spec committed)

---

## File Structure

### Create

- `widgets/site-footer/index.ts` — public API
- `widgets/site-footer/ui/site-footer.tsx` — the credit-line widget
- `widgets/site-footer/ui/site-footer.stories.tsx` — Storybook
- `widgets/site-footer/ui/site-footer.test.tsx` — Vitest
- `proxy.test.ts` — regression test for admin-default fallback + cookie/redirect logic (T6 + T7 verification)
- `db/migrations/0013_rename_be_to_by.sql` — locale rename SQL
- `db/migrations/meta/0013_snapshot.json` — Drizzle-regenerated snapshot
- `messages/by.json` — renamed from `messages/be.json`
- `i18n/lang.ts` — `LOCALE_TO_LANG` map (or co-located in `i18n/routing.ts` — TBD per task)

### Modify

- `views/welcome/ui/welcome-page.tsx` — swap NailFan → FlameMonogram; mount welcome LocaleSwitcher
- `views/master/ui/master-page.tsx` — photo container size
- `features/locale-switcher/ui/locale-switcher.tsx` — pill UI + variant prop
- `widgets/app-header/ui/app-header.tsx` — embed LocaleSwitcher
- `widgets/app-header/ui/app-header.test.tsx` + `.stories.tsx` — coverage
- `features/site-settings-admin/ui/site-settings-form.tsx` — palette live preview
- `features/site-settings-admin/ui/site-settings-form.test.tsx` — preview assertions
- `app/[locale]/layout.tsx` — mount `<SiteFooter />`, use `LOCALE_TO_LANG` for `<html lang>` and hreflang
- `proxy.ts` — 308 redirect + NEXT_LOCALE rewrite + clarifying comment
- `i18n/routing.ts` — `be → by`, export `LOCALE_TO_LANG`
- `messages/en.json`, `messages/ru.json` — locale-switcher key + admin label key renames + new SiteFooter copy
- `db/schema.ts` — `*_be` columns → `*_by`, jsonb generic, TS field names
- `entities/master/api/load.ts` — drop ad-hoc `type Locale`; rename Be → By
- `views/profile/ui/profile-page.tsx`, `views/booking/api/submit.ts`, `app/[locale]/admin/bookings/page.tsx`, `app/[locale]/services/page.tsx`, `entities/service/api/load.ts`, `entities/site-settings/model/locale-fields.ts` — locale literal + field name replacements
- `features/services-admin/ui/includes-fieldset.tsx` — JSON write key `"be"` → `"by"`
- `views/home/ui/sections/atelier-motion.test.tsx`, all e2e specs iterating locales, all stories using `locale: "be"` — array literal updates
- `views/profile/ui/profile-page.test.tsx`, `entities/site-settings/model/schema.test.ts` — locale fixture updates

---

## Conventions

- **Always create work via TDD** (red → green → commit) per `superpowers:test-driven-development`. The failing test belongs in the same commit as the implementation, NOT in a separate commit, so reverts stay coherent.
- Run a single Vitest file via `npx vitest run path/to/file.test.tsx`. Run a single Playwright spec via `npx playwright test e2e/path.spec.ts`.
- Pre-commit (`husky`) runs `lint + test`. Pre-push runs `build`. Don't bypass.
- File paths use `@/*` alias; the alias resolves to repo root (no `src/`).
- Locale-aware navigation: import `Link`, `useRouter`, `usePathname` from `@/i18n/navigation`, not `next/link` or `next/navigation`.
- Storybook scans `shared/`, `entities/`, `features/`, `widgets/`, `views/` for `*.stories.tsx`. Stories are also auto-run as Vitest tests via `@storybook/addon-vitest`.

---

## Task 1 — Welcome screen: flame V instead of nail fan

**Files:**
- Modify: `views/welcome/ui/welcome-page.tsx:10` (import), lines 66-76 (motion block)

- [ ] **Step 1.1: Read welcome-page.tsx and the FlameMonogram API**

Read `shared/ui/flame-monogram/ui/flame-monogram.tsx` to confirm the prop signature (`letter`, sizing approach). Read welcome-page's existing NailFan block to know the container dimensions to preserve.

- [ ] **Step 1.2: Make the swap**

Replace `import { NailFan } from "@/shared/ui/nail-fan";` with `import { FlameMonogram } from "@/shared/ui/flame-monogram";`.

In the motion block at lines 66-76, replace:
```tsx
<NailFan
  palette={["#c9a96e", "#7d3a6f"]}
  className="size-full"
/>
```
with:
```tsx
<FlameMonogram letter="V" className="size-full" />
```

If FlameMonogram requires different aspect ratio than the existing `h-[150px] w-[240px]` wrapper, adjust the wrapper to a square or match what home-hero uses (read `views/home/ui/sections/home-hero.tsx` for reference). Aim for visual parity with home.

- [ ] **Step 1.3: Visual check**

Run `npm run dev` in another shell and open `/en/welcome`. Confirm the flame V renders and animates. The Welcome screen is reached via the root locale's onboarding flow — `app/[locale]/welcome/page.tsx`.

- [ ] **Step 1.4: Run the test suite**

```
npx vitest run views/welcome
npm run lint
```
Expected: pass.

- [ ] **Step 1.5: Commit**

```
git add views/welcome/ui/welcome-page.tsx
git commit -m "feat(welcome): use flame-V monogram instead of nail fan"
```

---

## Task 2 — Master profile photo size

**Files:**
- Modify: `views/master/ui/master-page.tsx:85` (photo container className)
- Modify: `views/master/ui/master-page.test.tsx` if it asserts on container class

- [ ] **Step 2.1: Write/update the failing test**

Open `views/master/ui/master-page.test.tsx`. Add a test asserting the photo container has `max-w-[320px]` and `mx-auto`. Skip if these already exist (they don't).

```tsx
it("photo container is centred and capped at 320px", () => {
  render(<MasterPage />);
  const frame = screen.getByText("Master").closest('[class*="aspect-"]');
  expect(frame?.className).toMatch(/aspect-\[1\/1\]/);
  expect(frame?.parentElement?.className).toMatch(/max-w-\[320px\]/);
  expect(frame?.parentElement?.className).toMatch(/mx-auto/);
});
```

Adjust the query strategy by reading the existing test file's patterns first — the assertion above is illustrative.

- [ ] **Step 2.2: Run to confirm fail**

`npx vitest run views/master/ui/master-page.test.tsx`
Expected: FAIL on the aspect / max-w assertions.

- [ ] **Step 2.3: Implement**

In `views/master/ui/master-page.tsx`, locate the photo block (lines ~83-127). Wrap the `<div className="gilded-lift glass-top relative aspect-[1/1.2] ...">` in `<div className="mx-auto max-w-[320px]">…</div>` AND change `aspect-[1/1.2]` to `aspect-[1/1]`.

- [ ] **Step 2.4: Run tests**

`npx vitest run views/master/ui/master-page.test.tsx && npm run lint`
Expected: PASS.

- [ ] **Step 2.5: Visual check**

In the dev server, navigate to `/en/master/<slug>` (or the seeded master slug). Confirm the photo is smaller, centred, and the gold frame/eyebrow still sits correctly inside.

- [ ] **Step 2.6: Commit**

```
git add views/master/ui/master-page.tsx views/master/ui/master-page.test.tsx
git commit -m "refactor(master): tighten profile photo size + center"
```

---

## Task 3 — `widgets/site-footer/` (component only)

**Files:**
- Create: `widgets/site-footer/index.ts`
- Create: `widgets/site-footer/ui/site-footer.tsx`
- Create: `widgets/site-footer/ui/site-footer.test.tsx`
- Create: `widgets/site-footer/ui/site-footer.stories.tsx`

This task creates the widget but does NOT yet mount it — task 4 handles the mount + translations. Splitting keeps each commit focused.

- [ ] **Step 3.1: Write the failing test**

Create `widgets/site-footer/ui/site-footer.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SiteFooter } from "./site-footer";

const messages = {
  SiteFooter: { credit_prefix: "Created with Love by" },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SiteFooter", () => {
  it("renders translated credit prefix and brand link", () => {
    renderWithIntl(<SiteFooter />);
    expect(screen.getByText(/Created with Love by/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Arcadeum Games Studio/i });
    expect(link).toHaveAttribute("href", "https://arcadeum.games");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringMatching(/noopener/));
  });
});
```

- [ ] **Step 3.2: Run to confirm fail**

`npx vitest run widgets/site-footer`
Expected: FAIL (module missing).

- [ ] **Step 3.3: Implement the widget**

Create `widgets/site-footer/ui/site-footer.tsx`:

```tsx
import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  return (
    <footer className="px-[22px] pb-4 pt-6 text-center font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
      {t("credit_prefix")}{" "}
      <a
        href="https://arcadeum.games"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Arcadeum Games Studio
      </a>
    </footer>
  );
}
```

Create `widgets/site-footer/index.ts`:

```ts
export { SiteFooter } from "./ui/site-footer";
```

- [ ] **Step 3.4: Re-run test**

`npx vitest run widgets/site-footer`
Expected: PASS.

- [ ] **Step 3.5: Storybook story**

Create `widgets/site-footer/ui/site-footer.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { SiteFooter } from "./site-footer";

const meta: Meta<typeof SiteFooter> = {
  title: "widgets/SiteFooter",
  component: SiteFooter,
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={{ SiteFooter: { credit_prefix: "Created with Love by" } }}
      >
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;

export const Default: StoryObj<typeof SiteFooter> = {};
```

- [ ] **Step 3.6: Story-as-test runs**

`npx vitest run` and check the storybook project picks it up. Expected: pass (no story errors).

- [ ] **Step 3.7: Commit**

```
git add widgets/site-footer/
git commit -m "feat(site-footer): add Arcadeum credit widget"
```

---

## Task 4 — Mount `<SiteFooter />` globally + translations

**Files:**
- Modify: `messages/en.json` (add SiteFooter namespace)
- Modify: `messages/ru.json` (add SiteFooter namespace)
- Modify: `messages/be.json` (add SiteFooter namespace — file still named be.json at this stage; task 7 renames to by.json)
- Modify: `app/[locale]/layout.tsx` — render `<SiteFooter />` after `{children}`

- [ ] **Step 4.1: Add the translations**

In each of `messages/en.json`, `messages/ru.json`, `messages/be.json`, add a top-level `SiteFooter` key (or extend if it already exists) with `credit_prefix`. Match the file's existing key sort order if it has one.

- en: `"credit_prefix": "Created with Love by"`
- ru: `"credit_prefix": "Создано с любовью"`
- by: `"credit_prefix": "Створана з любоўю"` (in `be.json` for now)

- [ ] **Step 4.2: Mount in the layout**

`app/[locale]/layout.tsx`:
- Add `import { SiteFooter } from "@/widgets/site-footer";` to imports.
- Inside `<body className="min-h-full flex flex-col">`, render `<SiteFooter />` AFTER `<NextIntlClientProvider>{children}</NextIntlClientProvider>` (so it sits below the page content; the flex-col on body makes it stack).

- [ ] **Step 4.3: Verify**

```
npm run lint
npx vitest run
```

- [ ] **Step 4.4: Visual check**

Run the dev server, visit `/en/home`, `/ru/home`, `/be/home`, `/en/welcome`, `/en/admin/site-settings`. Confirm the footer appears below every page and the text is translated per locale. On Welcome, confirm it doesn't push CTAs out of viewport on a normal phone height.

- [ ] **Step 4.5: Commit**

```
git add messages/en.json messages/ru.json messages/be.json app/[locale]/layout.tsx
git commit -m "feat(layout): mount SiteFooter globally with translated credit"
```

---

## Task 5 — `features/locale-switcher`: pill UI + variants

**Files:**
- Modify: `features/locale-switcher/ui/locale-switcher.tsx`
- Create: `features/locale-switcher/ui/locale-switcher.test.tsx`
- Create: `features/locale-switcher/ui/locale-switcher.stories.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `features/locale-switcher/ui/locale-switcher.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";

const messages = {
  LocaleSwitcher: { label: "Language", en: "English", ru: "Russian", be: "Belarusian" },
};

function renderAt(locale: "en" | "ru" | "be") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("renders a pill per locale with single-character label", () => {
    renderAt("en");
    expect(screen.getByRole("radio", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "RU" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "BE" })).toBeInTheDocument();
  });

  it("marks the active locale aria-checked", () => {
    renderAt("ru");
    expect(screen.getByRole("radio", { name: "RU" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "EN" })).toHaveAttribute("aria-checked", "false");
  });
});
```

- [ ] **Step 5.2: Run to confirm fail**

`npx vitest run features/locale-switcher`
Expected: FAIL on the role queries.

- [ ] **Step 5.3: Rewrite the component**

Replace the contents of `features/locale-switcher/ui/locale-switcher.tsx` with a segmented pill control mirroring the admin form's pill style. Accept a `variant: "header" | "welcome"` prop with `"header"` as default. Use `routing.locales.map(...)` to render one button per locale. Single-character labels (`l.toUpperCase()`). On click: `router.replace(pathname, { locale: l })` inside a `useTransition`.

Approximate styling — match the existing pill conventions in [features/site-settings-admin/ui/site-settings-form.tsx:138-164](../../../features/site-settings-admin/ui/site-settings-form.tsx):

```tsx
"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";

export interface LocaleSwitcherProps {
  variant?: "header" | "welcome";
}

export function LocaleSwitcher({ variant = "header" }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const sizeClass =
    variant === "welcome"
      ? "px-2 py-1 text-[10px] tracking-[0.18em]"
      : "px-2.5 py-1.5 text-[11px] tracking-[0.18em]";

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-line bg-transparent p-0.5"
    >
      {routing.locales.map((l) => {
        const selected = locale === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={l.toUpperCase()}
            disabled={isPending}
            onClick={() => {
              if (l === locale) return;
              startTransition(() => {
                router.replace(pathname, { locale: l });
              });
            }}
            className={cn(
              "rounded-full font-mono uppercase",
              sizeClass,
              "transition-colors duration-fast ease-out",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              selected
                ? "bg-surface-2 text-text"
                : "text-text-2 hover:text-text",
            )}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5.4: Run test**

`npx vitest run features/locale-switcher`
Expected: PASS.

- [ ] **Step 5.5: Story**

Create `features/locale-switcher/ui/locale-switcher.stories.tsx` with two stories: `HeaderVariant` and `WelcomeVariant`, each wrapped in `NextIntlClientProvider` decorator.

- [ ] **Step 5.6: Lint + test sweep**

```
npm run lint
npx vitest run features/locale-switcher
```

- [ ] **Step 5.7: Commit**

```
git add features/locale-switcher/
git commit -m "refactor(locale-switcher): pill UI with header/welcome variants"
```

---

## Task 6 — Mount LocaleSwitcher in AppHeader

**Files:**
- Modify: `widgets/app-header/ui/app-header.tsx`
- Modify: `widgets/app-header/ui/app-header.test.tsx`
- Modify: `widgets/app-header/ui/app-header.stories.tsx` (story may already cover it)

- [ ] **Step 6.1: Update the AppHeader test**

In `widgets/app-header/ui/app-header.test.tsx`, add a test that asserts the header contains a `radiogroup` with `aria-label="Language"`.

- [ ] **Step 6.2: Run to confirm fail**

`npx vitest run widgets/app-header`
Expected: new test FAILs.

- [ ] **Step 6.3: Mount the switcher**

In `widgets/app-header/ui/app-header.tsx`, import `LocaleSwitcher` from `@/features/locale-switcher` (slice root only — not the deep path). Insert it inside the flex row, between the `title` slot and the `menu` button. Suggested placement: put it in the right-side cluster so it sits next to the menu button, separated by `gap-2`.

Wrap the right cluster in a flex container:

```tsx
<div className="flex items-center gap-2">
  <LocaleSwitcher />
  {menu}
</div>
```

Replace the standalone `{menu}` JSX at the end of the row with this cluster.

- [ ] **Step 6.4: Run tests**

`npx vitest run widgets/app-header`
Expected: PASS.

- [ ] **Step 6.5: Visual check**

In dev server, open `/en/home`, `/en/master/<slug>`, `/en/admin/site-settings`. Confirm the pill switcher sits to the left of the hamburger, doesn't crowd the title slot, and switches locale on click. Test clicking BE → URL becomes `/be/home`.

- [ ] **Step 6.6: Commit**

```
git add widgets/app-header/
git commit -m "feat(app-header): mount LocaleSwitcher pill in header"
```

---

## Task 7 — Mount LocaleSwitcher on Welcome screen

**Files:**
- Modify: `views/welcome/ui/welcome-page.tsx`

- [ ] **Step 7.1: Add the switcher**

Inside the top of the welcome layout (above the centred MonogramSeal, top-right corner), insert a fade-in motion wrapper containing `<LocaleSwitcher variant="welcome" />`. Position with `absolute top-4 right-[22px]` (or similar) so it doesn't compete with the centred wordmark. Match the fade-in delay used by the other top-of-page chrome.

Add import `import { LocaleSwitcher } from "@/features/locale-switcher";` at the top.

Example:

```tsx
<motion.div
  className="absolute top-4 right-[22px]"
  {...fade(0.4)}
>
  <LocaleSwitcher variant="welcome" />
</motion.div>
```

Place this before the centred column. Confirm `position: relative` is set on the outer wrapper (it is — `relative min-h-dvh overflow-hidden px-[22px]` on line 34).

- [ ] **Step 7.2: Update test if needed**

`views/welcome/ui/welcome-page.tsx` has no direct test (only `letter-reveal.test.tsx`). No new test required for placement — the LocaleSwitcher's own test covers behavior.

- [ ] **Step 7.3: Verify**

```
npm run lint && npx vitest run views/welcome
```
Visit `/en/welcome`, confirm the pill appears top-right and doesn't overlap content.

- [ ] **Step 7.4: Commit**

```
git add views/welcome/ui/welcome-page.tsx
git commit -m "feat(welcome): mount compact LocaleSwitcher top-right"
```

---

## Task 8 — Admin palette live preview

**Files:**
- Modify: `features/site-settings-admin/ui/site-settings-form.tsx`
- Modify: `features/site-settings-admin/ui/site-settings-form.test.tsx`

- [ ] **Step 8.1: Write the failing tests**

Open `features/site-settings-admin/ui/site-settings-form.test.tsx` and add:

```tsx
it("applies the selected palette to document.documentElement immediately on click", async () => {
  document.documentElement.dataset.palette = "rose";
  render(<SiteSettingsForm initial={{ ...initial, defaultPalette: "rose" }} vipBasePrice={…} onSubmit={…} />);
  await user.click(screen.getByRole("radio", { name: /Lilac/i }));
  expect(document.documentElement.dataset.palette).toBe("lilac");
});

it("reverts the palette on unmount when save was not invoked", async () => {
  document.documentElement.dataset.palette = "rose";
  const { unmount } = render(<SiteSettingsForm initial={{ ...initial, defaultPalette: "rose" }} vipBasePrice={…} onSubmit={…} />);
  await user.click(screen.getByRole("radio", { name: /Lilac/i }));
  expect(document.documentElement.dataset.palette).toBe("lilac");
  unmount();
  expect(document.documentElement.dataset.palette).toBe("rose");
});

it("keeps the palette persisted after a successful save", async () => {
  document.documentElement.dataset.palette = "rose";
  const submit = vi.fn().mockResolvedValue({ ok: true });
  const { unmount } = render(<SiteSettingsForm initial={{ ...initial, defaultPalette: "rose" }} vipBasePrice={…} onSubmit={submit} />);
  await user.click(screen.getByRole("radio", { name: /Lilac/i }));
  await user.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() => expect(submit).toHaveBeenCalled());
  unmount();
  expect(document.documentElement.dataset.palette).toBe("lilac");
});
```

Read the existing test file first — pull in its render-helpers and fixtures (`initial`, palette names). Match the names of palette radios from the actual `PALETTES` config rather than guessing.

- [ ] **Step 8.2: Run to confirm fail**

`npx vitest run features/site-settings-admin`
Expected: 3 new tests FAIL.

- [ ] **Step 8.3: Implement the preview**

In `features/site-settings-admin/ui/site-settings-form.tsx`:

1. Add `import { useEffect, useRef } from "react";` (already imports useState/useTransition — add what's missing).
2. Inside the component, after the `useState` declarations:

```tsx
const baselineRef = useRef(initial.defaultPalette);

useEffect(() => {
  const html = document.documentElement;
  html.dataset.palette = defaultPalette;
  return () => {
    html.dataset.palette = baselineRef.current;
  };
}, [defaultPalette]);
```

3. In `handleSubmit`, on `result.ok`, update the baseline so unmount no longer reverts:

```ts
if (result.ok) {
  baselineRef.current = defaultPalette;
  setStatus({ kind: "saved" });
} else {
  setStatus({ kind: "error", message: result.error });
}
```

- [ ] **Step 8.4: Run tests**

`npx vitest run features/site-settings-admin`
Expected: PASS.

- [ ] **Step 8.5: Visual check**

In dev server, open `/en/admin/site-settings`. Click each palette — the surrounding page (Aurora, gold accents, surfaces) should change immediately. Navigate away without saving (`/en/home`) — should revert to the pre-edit palette. Repeat, save, navigate away — should persist.

- [ ] **Step 8.6: Commit**

```
git add features/site-settings-admin/
git commit -m "feat(admin): live palette preview before save"
```

---

## Task 9 — Proxy regression test (default-locale fallback)

**Files:**
- Modify: `proxy.ts` — add a clarifying comment
- Create: `proxy.test.ts`

This task pins existing behavior: when admin sets a default locale and a visitor's Accept-Language doesn't match any supported locale, they land on the admin default. We are NOT changing behavior — only locking it in.

- [ ] **Step 9.1: Write the test**

Create `proxy.test.ts` at repo root:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const createMiddleware = vi.fn(() => vi.fn(() => new Response()));
vi.mock("next-intl/middleware", () => ({ default: createMiddleware }));

const getCachedDefaultLocale = vi.fn();
vi.mock("@/shared/lib/site-settings-cache", () => ({
  getCachedDefaultLocale,
  invalidateDefaultLocaleCache: vi.fn(),
}));

describe("proxy", () => {
  beforeEach(() => {
    createMiddleware.mockClear();
    getCachedDefaultLocale.mockReset();
  });

  it("forwards the admin-chosen default locale to next-intl", async () => {
    getCachedDefaultLocale.mockResolvedValue("en");
    const proxy = (await import("./proxy")).default;
    await proxy({ url: "http://localhost/", cookies: { get: () => undefined }, nextUrl: new URL("http://localhost/") } as unknown as NextRequest);
    expect(createMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLocale: "en" }),
    );
  });

  it("flows a different cached default through unchanged", async () => {
    getCachedDefaultLocale.mockResolvedValue("ru");
    const proxy = (await import("./proxy")).default;
    await proxy({ url: "http://localhost/", cookies: { get: () => undefined }, nextUrl: new URL("http://localhost/") } as unknown as NextRequest);
    expect(createMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLocale: "ru" }),
    );
  });
});
```

The minimal `NextRequest` shape above is enough — next-intl's middleware will get its handler call but we don't assert on the response. Adjust the mock shape if `proxy.ts` reads other request fields after task 18 lands.

- [ ] **Step 9.2: Update `proxy.ts` comment**

Just before the `getCachedDefaultLocale()` call in `proxy.ts`, ensure there's a comment along these lines:

```ts
// Admin's chosen default locale flows here. next-intl uses it as the
// fallback when the browser's Accept-Language doesn't match any
// supported locale; visitors with a matching language still get
// auto-routed. Test coverage: proxy.test.ts.
```

- [ ] **Step 9.3: Run**

`npx vitest run proxy.test.ts`
Expected: PASS.

- [ ] **Step 9.4: Commit**

```
git add proxy.ts proxy.test.ts
git commit -m "test(proxy): pin admin default-locale fallback behavior"
```

---

## Task 10 — `i18n/routing.ts`: rename `be` → `by` + `LOCALE_TO_LANG`

**Files:**
- Modify: `i18n/routing.ts`

- [ ] **Step 10.1: Write a routing test**

Create `i18n/routing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { routing, LOCALE_TO_LANG } from "./routing";

describe("routing", () => {
  it("lists by instead of be in locales", () => {
    expect(routing.locales).toContain("by");
    expect(routing.locales).not.toContain("be");
  });

  it("maps by to be-BY BCP-47 tag", () => {
    expect(LOCALE_TO_LANG.by).toBe("be-BY");
    expect(LOCALE_TO_LANG.en).toBe("en");
    expect(LOCALE_TO_LANG.ru).toBe("ru");
  });
});
```

- [ ] **Step 10.2: Run to confirm fail**

`npx vitest run i18n/routing.test.ts`
Expected: FAIL (LOCALE_TO_LANG missing, "by" not in locales).

- [ ] **Step 10.3: Edit `i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "by"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

/**
 * Maps internal locale identifiers to valid BCP-47 language tags for
 * <html lang> and hreflang. `by` is an ISO 3166 country code and is
 * invalid as a language tag; emit `be-BY` instead.
 */
export const LOCALE_TO_LANG: Record<Locale, string> = {
  en: "en",
  ru: "ru",
  by: "be-BY",
};
```

- [ ] **Step 10.4: Run test**

`npx vitest run i18n/routing.test.ts`
Expected: PASS.

DO NOT commit yet. Many other files now type-fail. We commit task 10 + everything downstream as one atomic "be → by" commit (see task 19).

---

## Task 11 — Rename `messages/be.json` → `messages/by.json` + admin keys

**Files:**
- Move: `messages/be.json` → `messages/by.json`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/by.json` — rename `LocaleSwitcher.be` key to `by`; rename all `label_*_be` keys to `label_*_by`

- [ ] **Step 11.1: Move the file**

```
git mv messages/be.json messages/by.json
```

- [ ] **Step 11.2: Rename keys in each locale file**

For all three message files:
- `"be": "..."` under `LocaleSwitcher` → `"by": "..."`
- Every `label_name_be`, `label_role_be`, `label_bio_be`, `label_quote_be`, `label_blurb_be`, `label_address_be`, `label_city_be` (and any siblings) → suffix `_by`. Grep across `messages/` first to enumerate them.

```
grep -n "_be" messages/en.json messages/ru.json messages/by.json
```

Rename each match using the Edit tool one at a time (don't bulk-replace blindly; some legitimate `_be` strings may exist in body copy).

- [ ] **Step 11.3: Run lint + test**

Tests reference these keys via `t("label_name_be")` — they will fail. That's expected; task 15 fixes them.

`npm run lint`

ESLint shouldn't complain (it doesn't type-check translations). Move on.

---

## Task 12 — `app/[locale]/layout.tsx`: use `LOCALE_TO_LANG`

**Files:**
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 12.1: Update OG_LOCALE map**

Change the existing object:

```ts
const OG_LOCALE: Record<string, string> = {
  en: "en_US",
  ru: "ru_RU",
  by: "be_BY",  // was: be
};
```

- [ ] **Step 12.2: Update `<html lang>` and hreflang**

Add `import { LOCALE_TO_LANG } from "@/i18n/routing";` (or wherever it lives).

In `generateMetadata`, replace the `languages: Object.fromEntries(...)` block:

```ts
languages: Object.fromEntries(
  routing.locales.map((l) => [LOCALE_TO_LANG[l], `${SITE_URL}/${l}`]),
),
```

In `LocaleLayout`'s `<html>` tag (line 126):

```tsx
<html
  lang={LOCALE_TO_LANG[locale as Locale]}
  data-palette={settings.defaultPalette}
  className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable} h-full antialiased`}
>
```

- [ ] **Step 12.3: Run e2e og spec**

This intersects with `e2e/og.spec.ts` which iterates locales. Leave it until task 17 updates those iterations.

---

## Task 13 — `db/schema.ts`: rename `*_be` columns + jsonb generic

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 13.1: Rename Drizzle column declarations**

In `db/schema.ts`, change every column declaration of the form:

```ts
nameBe: text("name_be").notNull(),
```

to:

```ts
nameBy: text("name_by").notNull(),
```

Apply to all `*Be` field names AND their `text("…_be")` Postgres column names. Use the line refs from the grep run earlier (lines 239, 245, 282, 308, 311, 363, 366, 369, 372 and any others).

- [ ] **Step 13.2: Update the jsonb generic**

Line 313:

```ts
.$type<Array<{ en: string; ru: string; by: string }>>()
```

Search `db/schema.ts` for any other `$type<` generics that mention `be` and update them similarly.

- [ ] **Step 13.3: Run lint**

`npm run lint`

Type-check via the IDE/tsc will fail downstream (callers reading `c.nameBe`). That's expected; task 15 fixes them.

---

## Task 14 — Generate + manually edit migration `0013_rename_be_to_by.sql`

**Files:**
- Create: `db/migrations/0013_rename_be_to_by.sql`
- Create/regenerate: `db/migrations/meta/0013_snapshot.json`
- Modify: `db/migrations/meta/_journal.json`

- [ ] **Step 14.1: Run drizzle-kit generate**

```
npx drizzle-kit generate
```

This produces a draft `db/migrations/0013_xxx.sql` containing `DROP COLUMN name_be` + `ADD COLUMN name_by` pairs — **destructive**, we must NOT keep this. It also creates `meta/0013_snapshot.json` and updates `_journal.json` — we KEEP those.

- [ ] **Step 14.2: Hand-rewrite the SQL**

Rename the generated file to `0013_rename_be_to_by.sql` (delete the auto-generated name). Replace its contents with:

```sql
-- Rename Belarusian locale identifier from `be` to `by` across:
--   * Schema columns: every *_be column → *_by.
--   * JSON dictionaries that store {en, ru, be} payloads.
--   * site_settings.default_locale value.

-- Column renames (data-preserving). One ALTER per column.
ALTER TABLE services RENAME COLUMN name_be TO name_by;
ALTER TABLE services RENAME COLUMN blurb_be TO blurb_by;
ALTER TABLE service_categories RENAME COLUMN name_be TO name_by;
ALTER TABLE masters RENAME COLUMN name_be TO name_by;
ALTER TABLE masters RENAME COLUMN role_be TO role_by;
ALTER TABLE masters RENAME COLUMN bio_be TO bio_by;
ALTER TABLE masters RENAME COLUMN quote_be TO quote_by;
ALTER TABLE site_settings RENAME COLUMN address_be TO address_by;
ALTER TABLE site_settings RENAME COLUMN city_be TO city_by;

-- JSON dictionary rewrite for services.includes (jsonb array of {en, ru, be}).
UPDATE services
  SET includes = (
    SELECT jsonb_agg(
      (i - 'be') || jsonb_build_object('by', i->'be')
    )
    FROM jsonb_array_elements(includes) AS i
  )
  WHERE includes::text LIKE '%"be"%';

-- Migrate default_locale.
UPDATE site_settings SET default_locale = 'by' WHERE default_locale = 'be';
```

**IMPORTANT:** verify the full list of `*_be` columns by re-running `grep -n "_be\"\|\"_be\b" db/schema.ts` before finalizing. Add any you missed. Discover other jsonb dictionary columns by searching for `$type<.*be:` in `db/schema.ts`.

- [ ] **Step 14.3: Inspect the regenerated snapshot**

Open `db/migrations/meta/0013_snapshot.json` — confirm columns now have `_by` names. Open `_journal.json` — confirm the new entry references the renamed file.

If the auto-generated snapshot embedded the destructive change, regenerate by editing `db/schema.ts` (already done in task 13) and re-running `npx drizzle-kit generate` after deleting the bad SQL — the snapshot is derived from schema.ts.

- [ ] **Step 14.4: Apply locally to a scratch DB and verify**

Spin up a throwaway Postgres (e.g. `pg_dump` the dev DB, restore to a temp one), run `npm run db:migrate` or whatever the project uses. Confirm:

```sql
\d services        -- includes name_by, blurb_by; no _be
SELECT default_locale FROM site_settings;  -- 'by' if it was 'be'
SELECT includes->0 FROM services LIMIT 1;  -- has "by" key, no "be"
```

Skip this step if a scratch DB isn't available, but flag it for the reviewer.

- [ ] **Step 14.5: Lint sweep**

`npm run lint`

Will surface type errors in callers — task 15 next.

---

## Task 15 — Code-side replacements (locale literals + field names)

**Files (search-driven, list per file below):**
- `app/[locale]/admin/bookings/page.tsx:100`
- `app/[locale]/services/page.tsx:43`
- `views/booking/api/submit.ts:28`
- `views/profile/ui/profile-page.tsx:99,114,139,146` (and test fixtures)
- `entities/master/api/load.ts:14,24`
- `entities/service/api/load.ts:28,34`
- `entities/site-settings/model/locale-fields.ts:8,21`
- `entities/site-settings/model/schema.ts`, `schema.test.ts:36`
- `entities/site-settings/model/types.ts`
- `features/services-admin/ui/includes-fieldset.tsx:85` (literal JSON write — important)
- `features/testimonials-admin/ui/testimonial-row.tsx:31,38`
- `views/profile/ui/profile-page.test.tsx`
- `views/home/ui/sections/atelier-motion.test.tsx:9,33`
- All Storybook files using `locale: "be"` — e.g. `shared/ui/price/ui/price.stories.tsx:39`

- [ ] **Step 15.1: Enumerate all touch sites**

```
grep -rn "locale === \"be\"\|locale === 'be'\|locale: \"be\"\|locale: 'be'" \
  --include="*.tsx" --include="*.ts" \
  app entities features views shared widgets e2e i18n proxy.ts | grep -v node_modules
grep -rn "nameBe\|roleBe\|bioBe\|quoteBe\|blurbBe\|addressBe\|cityBe\|masterNameBe" \
  --include="*.tsx" --include="*.ts" --include="*.json" \
  app entities features views shared widgets db | grep -v node_modules
grep -rn "label_.*_be" --include="*.tsx" --include="*.ts" app entities features views | grep -v node_modules
```

Save the union list before editing.

- [ ] **Step 15.2: Apply replacements**

For each match:
- `locale === "be"` → `locale === "by"`
- `nameBe` → `nameBy`, `roleBe` → `roleBy`, …, `masterNameBe` → `masterNameBy`
- `label_name_be` → `label_name_by`, etc.
- `locale: "be"` (story/test fixture) → `locale: "by"`

Use Edit tool per file. Do NOT use `sed` blind replace — there may be `Be` strings that mean other things (e.g. a master named "Bea"). Eyeball each diff.

- [ ] **Step 15.3: Special case — `entities/master/api/load.ts` ad-hoc type**

Replace:
```ts
type Locale = "en" | "ru" | "be";
```
with:
```ts
import type { Locale } from "@/i18n/routing";
```
(Ensure it doesn't shadow another import.)

- [ ] **Step 15.4: Special case — `features/services-admin/ui/includes-fieldset.tsx:85`**

The `onChange={(e) => update(i, "be", e.target.value)}` literal — change `"be"` → `"by"`. This is the JSON write path; without this, the admin form would save `{"en":"…","ru":"…","be":""}` against a schema that no longer reads `be`.

- [ ] **Step 15.5: Special case — `app/[locale]/layout.tsx` OG_LOCALE**

Already done in task 12.

- [ ] **Step 15.6: Lint + test**

```
npm run lint
npx vitest run
```

Expected: PASS. Surface any failing test files and rerun task 15 against the missed identifiers.

---

## Task 16 — e2e and story locale-array updates

**Files:**
- `e2e/not-found.spec.ts:29`
- `e2e/og.spec.ts:56`
- Any other e2e iterating `["en","ru","be"]` — grep first
- All `*.stories.tsx` files with `locale: "be"` literals

- [ ] **Step 16.1: Enumerate**

```
grep -rn '\["en", *"ru", *"be"\]' --include="*.ts" --include="*.tsx" .
grep -rn 'locale: *"be"' --include="*.stories.tsx" .
```

- [ ] **Step 16.2: Replace**

Each `"be"` → `"by"` in those arrays/literals.

- [ ] **Step 16.3: Lint + Vitest**

`npm run lint && npx vitest run`
Expected: PASS.

- [ ] **Step 16.4: Skip e2e for now**

E2E run waits until task 18 + 19; running it mid-rename without the redirect would yield noisy failures.

---

## Task 17 — Verify nothing left behind

- [ ] **Step 17.1: Search for stragglers**

```
grep -rn "\"be\"\|'be'\b" --include="*.tsx" --include="*.ts" --include="*.json" --include="*.sql" \
  app entities features views shared widgets e2e i18n messages db proxy.ts \
  | grep -v node_modules | grep -v "_test\." | grep -v "site_settings_form\.test\.ts"
grep -rn "nameBe\|roleBe\|bioBe\|quoteBe\|blurbBe\|addressBe\|cityBe\|masterNameBe\|label_.*_be" \
  --include="*.tsx" --include="*.ts" --include="*.json" \
  app entities features views shared widgets db | grep -v node_modules
```

Both should return zero matches (except harmless body-copy strings or comments that legitimately contain "be" as English).

Hand-inspect any remaining hits — some `"be"` strings inside the en/ru/by message JSON files are actual prose, not identifiers, and stay.

- [ ] **Step 17.2: Confirm `messages/by.json` is referenced**

```
grep -rn "be.json\|messages/be" --include="*.ts" --include="*.tsx" .
```
Expected: zero.

---

## Task 18 — proxy.ts: 308 redirect + NEXT_LOCALE cookie rewrite

**Files:**
- Modify: `proxy.ts`
- Modify: `proxy.test.ts` — add redirect + cookie tests

- [ ] **Step 18.1: Add failing tests**

In `proxy.test.ts`, append:

```ts
it("redirects /be → /by with 308", async () => {
  getCachedDefaultLocale.mockResolvedValue("en");
  const proxy = (await import("./proxy")).default;
  const req = new Request("https://x.test/be/home?foo=bar", { redirect: "manual" });
  const res = await proxy(req as unknown as NextRequest);
  expect(res.status).toBe(308);
  expect(res.headers.get("location")).toBe("https://x.test/by/home?foo=bar");
});

it("rewrites NEXT_LOCALE=be cookie before next-intl reads it", async () => {
  getCachedDefaultLocale.mockResolvedValue("en");
  const proxy = (await import("./proxy")).default;
  const setCookie = vi.fn();
  const getCookie = vi.fn().mockReturnValue({ value: "be" });
  const req = {
    url: "https://x.test/",
    nextUrl: new URL("https://x.test/"),
    cookies: { get: getCookie, set: setCookie },
  } as unknown as NextRequest;
  await proxy(req);
  expect(setCookie).toHaveBeenCalledWith("NEXT_LOCALE", "by");
});
```

Adjust to match `proxy.test.ts`'s actual mock surface — `NextRequest.cookies.set` is a real method on the Next.js side; if testing the wrapper interface is awkward, mock `req.cookies` as a Map-like.

- [ ] **Step 18.2: Run to confirm fail**

`npx vitest run proxy.test.ts`
Expected: 2 new tests FAIL.

- [ ] **Step 18.3: Update `proxy.ts`**

```ts
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { getCachedDefaultLocale } from "@/shared/lib/site-settings-cache";

export default async function proxy(req: NextRequest) {
  const url = new URL(req.url);

  // Back-compat: the Belarusian locale id changed from `be` to `by`.
  // 308 (permanent + method-preserving) any /be/* requests so old
  // bookmarks survive.
  if (url.pathname === "/be" || url.pathname.startsWith("/be/")) {
    const target = new URL(req.url);
    target.pathname = "/by" + url.pathname.slice("/be".length);
    return Response.redirect(target.toString(), 308);
  }

  // Returning visitors carry NEXT_LOCALE=be from before the rename.
  // Rewrite the incoming cookie value so next-intl recognizes the
  // locale (otherwise it would treat it as unknown and fall back to
  // the admin default, surprising the user). next-intl writes a
  // Set-Cookie with the corrected value as part of its normal flow.
  if (req.cookies.get("NEXT_LOCALE")?.value === "be") {
    req.cookies.set("NEXT_LOCALE", "by");
  }

  // Admin's chosen default locale flows here as the next-intl
  // fallback when Accept-Language doesn't match any supported locale.
  // Test coverage: proxy.test.ts.
  const defaultLocale = await getCachedDefaultLocale();
  const handler = createMiddleware({ ...routing, defaultLocale });
  return handler(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 18.4: Run tests**

`npx vitest run proxy.test.ts`
Expected: PASS.

---

## Task 19 — Final sweep + atomic `be → by` commit

- [ ] **Step 19.1: Lint, full test, build**

```
npm run lint
npx vitest run
npm run build
```

All three must pass. Fix surfaced issues case-by-case.

- [ ] **Step 19.2: Full e2e run**

```
npm run e2e
```

Confirms the redirect works, locale switching works, the rename hasn't broken any flow.

- [ ] **Step 19.3: Stage everything for the be→by atomic commit**

```
git status
```

Expected unstaged + untracked:
- modified: `i18n/routing.ts`
- modified: `messages/en.json`, `messages/ru.json`
- renamed: `messages/be.json → messages/by.json`
- modified: `app/[locale]/layout.tsx`
- modified: `db/schema.ts`
- new file: `db/migrations/0013_rename_be_to_by.sql`
- modified: `db/migrations/meta/_journal.json`
- new file: `db/migrations/meta/0013_snapshot.json`
- modified: many app/entities/features/views/widgets `.tsx` and `.ts`
- modified: `proxy.ts`, `proxy.test.ts`
- modified: `i18n/routing.test.ts`
- modified: e2e specs + stories

- [ ] **Step 19.4: Commit**

```
git add .
git commit -m "$(cat <<'EOF'
refactor(i18n): rename Belarusian locale be → by

- URL prefix /be → /by; messages/be.json → messages/by.json
- Drizzle columns *_be → *_by + services.includes JSON key
- proxy: 308 redirect /be/* → /by/*; NEXT_LOCALE cookie rewrite
- <html lang> and hreflang via LOCALE_TO_LANG (by → be-BY)
- Schema fixture: 0013_rename_be_to_by.sql data migration
EOF
)"
```

- [ ] **Step 19.5: Push (waits for husky pre-push build)**

```
git push -u origin feature/multi-fixes
```

Expected: build passes, push succeeds.

---

## Out of plan, on the engineer's judgment

- If a step's exact line refs are stale (file changed since spec was written), use the surrounding context to locate the new line and proceed.
- If a code-side replacement turns up a site that's part of a public API contract (URL slug, external webhook), flag it in the commit message instead of silently changing it.
- If `drizzle-kit generate` produces a snapshot that disagrees with the hand-written migration (e.g. an extra column was added since), reconcile by editing schema first then regenerating.
- Each commit must pass husky pre-commit (lint + Vitest). The final push runs the build. Don't bypass with `--no-verify`.

---

## Acceptance criteria (whole branch)

- [ ] `/en/welcome` shows flame-V monogram (no nail fan).
- [ ] `/en/master/<slug>` shows photo in a square, max-width 320px, centred.
- [ ] Every locale-prefixed page shows the SiteFooter credit line, link points to https://arcadeum.games.
- [ ] AppHeader contains a 3-pill locale switcher; clicking switches locale and preserves path.
- [ ] Welcome page has the same switcher (compact variant) top-right.
- [ ] `/en/admin/site-settings`: clicking a palette changes the page colors immediately; navigating away without saving reverts; saving + navigating away persists.
- [ ] `npm run lint && npx vitest run && npm run build && npm run e2e` all pass.
- [ ] `/be/home` returns 308 redirect to `/by/home`.
- [ ] An incoming request with `Cookie: NEXT_LOCALE=be` is normalized to `by` (no admin-default surprise).
- [ ] `<html lang>` is `be-BY` for `/by/*` (validatable via `curl -s /by/home | grep '<html'`).
- [ ] Postgres: `services` has `name_by`/`blurb_by` columns and `includes` JSON entries with `by` keys.
