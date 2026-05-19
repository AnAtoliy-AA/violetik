---
name: new-web-page
description: Add a new page (route) to the Next.js App Router. Use when creating any new URL/route. Enforces locale-prefixed routing, translations in every locale, FSD composition (don't put logic in page.tsx), and locale-aware navigation.
---

This project uses Next.js 16 App Router with locale-prefix routing via `next-intl`. Every page lives under `app/[locale]/…` so it resolves at `/en/<route>`, `/ru/<route>`, `/be/<route>`. Pages are **composition glue** — pull UI from `features/`, `widgets/`, `entities/`, `shared/ui/`. Logic and complex JSX do not belong in `page.tsx`.

## Step 0 — Check before creating

```bash
ls app/\[locale\]/                           # existing routes
grep -ril "<keyword>" features widgets       # reusable building blocks
```

If a similar widget/feature exists, compose it. Don't reinvent.

## Default pattern (server component)

For most pages, one file is enough:

```
app/[locale]/<route>/
└── page.tsx
```

```tsx
// app/[locale]/<route>/page.tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
// import widgets/features as needed:
// import { SomeWidget } from "@/widgets/some-widget";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "<PageName>" });
  return { title: t("metaTitle") };
}

export default async function <PageName>Page({
  params,
}: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);                  // REQUIRED for static rendering
  const t = await getTranslations("<PageName>");

  return (
    <main className="p-8 flex flex-col gap-6">
      <h1 className="text-2xl">{t("title")}</h1>
      {/* compose features / widgets here */}
    </main>
  );
}
```

Rules:
- `params` and `searchParams` are **Promises** in Next.js 15+ — always `await` them.
- Call `setRequestLocale(locale)` before any `getTranslations` in the request lifecycle. Without it, the page falls back to dynamic rendering.
- Use the page-specific translation namespace (e.g. `Profile`, `Settings`). One namespace per page; keep keys flat under it.

## When to split into a client island

Only split when you actually need it. Reasons to split:
- The view uses browser-only APIs (`window`, `document`, `IntersectionObserver`).
- Heavy interactive deps (charts, editors, maps) you want to lazy-load.
- The page needs client state (`useState`, `useReducer`) for more than a single small interaction.

Split pattern:

```
app/[locale]/<route>/
├── page.tsx           ← server: metadata, translations, layout shell
└── <name>-view.tsx    ← 'use client': interactive UI
```

`page.tsx` renders the static shell + passes server-fetched data / messages as props to `<NameView />`. Don't dynamically import the view just to "be safe" — that's cargo-culting. The `next/dynamic` + `ssr: false` + skeleton pattern is only for genuinely heavy client deps.

If logic lives in the view, prefer moving it into a `features/<feature>/` slice instead of leaving it in the route. Routes stay thin.

## Translations — add to ALL locales

Every page namespace must exist in **all three** message files. Missing keys throw at runtime in dev and silently fall back in prod — neither is OK.

```json
// messages/en.json
{
  "<PageName>": {
    "metaTitle": "Page Title",
    "title": "Welcome",
    "...": "..."
  }
}
```

Then mirror identical keys in `messages/ru.json` and `messages/be.json`. Use the page's component name as the namespace.

## Navigation — locale-aware

Inside the app, **never** use `next/link` or `next/navigation`. Use the wrappers from `i18n/navigation.ts` (at the repo root):

```tsx
import { Link, useRouter, usePathname } from "@/i18n/navigation";
```

These preserve the active locale across navigations and let the locale switcher work. `next/link` would drop the prefix.

## Optional route files (add only if you need them)

| File | Purpose |
|---|---|
| `loading.tsx` | Suspense fallback while the server component streams. |
| `error.tsx` | `'use client'` error boundary for this segment. |
| `not-found.tsx` | Local 404 when `notFound()` is called. |
| `layout.tsx` | Wraps this segment + its children. Inherits from the locale layout. |

Don't create these preemptively — only when there's a concrete need.

## Tests

- **e2e** (preferred for new pages): add a Playwright spec to `e2e/` (at the repo root) that visits `/en/<route>` and asserts on visible content / interactions. See `e2e/home.spec.ts` for the shape.
- **Vitest**: not for whole pages. If a page contains a small client-only interaction worth unit-testing, extract it into a `features/` slice and test it there (see `new-ui-component` skill).

## Checklist (don't skip)

- [ ] Route lives under `app/[locale]/<route>/`
- [ ] `params` is treated as a `Promise<…>` and awaited
- [ ] `setRequestLocale(locale)` called before any `getTranslations`
- [ ] `generateMetadata` set (with translated `title` where appropriate)
- [ ] Translation namespace added to **en.json AND ru.json AND be.json** with the same keys
- [ ] All in-app links use `@/i18n/navigation`, never `next/link`
- [ ] Page composes features/widgets — no significant logic in `page.tsx`
- [ ] e2e spec added in `e2e/` covering the new route
- [ ] `npm run lint && npm test && npm run build` all green
