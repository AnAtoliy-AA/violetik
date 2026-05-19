# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint ([eslint.config.mjs](eslint.config.mjs))
- `npm test` — Vitest, single run
- `npm run test:watch` — Vitest in watch mode
- `npm run e2e` — Playwright e2e tests (boots its own dev server on port 3100; stop any running `next dev` first — Next.js 16 only allows one dev server per project)
- `npm run e2e:ui` — Playwright with the UI runner
- `npm run storybook` — Storybook dev (port 6006)
- `npm run build-storybook` — Storybook static build

Run a single Vitest file: `npx vitest run path/to/file.test.tsx`. Run a single Playwright test: `npx playwright test e2e/home.spec.ts`.

## Stack

- **Next.js 16** App Router, no `src/` directory
- **React 19**
- **Tailwind CSS v4** via `@tailwindcss/postcss` — no JS config; theme tokens live in [app/globals.css](app/globals.css) (`@theme`). Dark variant is wired via `@custom-variant dark (&:where(.dark, .dark *))` so the `dark` class set by `next-themes` activates dark utilities.
- **TypeScript strict**, alias `@/*` → repo root ([tsconfig.json](tsconfig.json))
- **next-intl** (path-prefix routing) — locales: `en`, `ru`, `be`; default `en`
- **next-themes** — class strategy, system + light + dark
- **Vitest** + Testing Library + jsdom — config in [vitest.config.ts](vitest.config.ts) uses two projects: the default jsdom project and the `storybook` project (browser-based, via `@storybook/addon-vitest` + Playwright Chromium) that runs every story as a test
- **Playwright** for e2e
- **Storybook** (`@storybook/nextjs-vite`) — config in [.storybook/](.storybook/), scans `shared/`, `entities/`, `features/`, `widgets/` for `*.stories.tsx`; Tailwind globals imported in [.storybook/preview.tsx](.storybook/preview.tsx)
- **Husky** git hooks: `pre-commit` runs `lint` + `test`; `pre-push` runs `build` ([.husky/](.husky/))

## Architecture — Feature-Sliced Design (FSD)

This project follows **[Feature-Sliced Design](https://feature-sliced.github.io/documentation/)**. Layers are listed top → bottom; imports may only point **downward** (an `app` file can import from `features`, but never the reverse):

| Layer | Purpose |
|---|---|
| `app/` | Next.js App Router routes + global init (providers, root layout). Also the FSD `app` layer. |
| `pages/` | Page-level compositions when Next.js route files need more than a thin wrapper. |
| `widgets/` | Large self-contained UI blocks composed of features + entities. |
| `features/` | User-facing actions / interactive units (e.g. `theme-switcher`, `locale-switcher`). |
| `entities/` | Business entities (user, post, …). |
| `shared/` | UI primitives, libs, configs, helpers, types — no business logic. |

Within a slice, organize by segment: `ui/`, `model/`, `lib/`, `api/`, `config/` (only what's needed). Expose the slice's public API through its `index.ts`; never deep-import another slice's internals.

**Current slices**:
- [app/providers.tsx](app/providers.tsx) — `next-themes` wrapper (app layer, imported by the locale layout).
- [shared/ui/button/](shared/ui/button/) — canonical `Button` primitive with story + test. Reference for new shared/ui components.
- [features/theme-switcher/](features/theme-switcher/) — exposes `ThemeSwitcher`. Public API: [features/theme-switcher/index.ts](features/theme-switcher/index.ts).
- [features/locale-switcher/](features/locale-switcher/) — exposes `LocaleSwitcher`. Public API: [features/locale-switcher/index.ts](features/locale-switcher/index.ts).

When adding a new UI component, follow the `new-ui-component` project skill in [.claude/skills/new-ui-component/SKILL.md](.claude/skills/new-ui-component/SKILL.md) — Tailwind, mandatory Storybook story, mandatory Vitest test, check for existing first.

Import features through the slice root (`@/features/theme-switcher`), never the segment file directly (`@/features/theme-switcher/ui/theme-switcher`). Tests living inside the slice may use relative imports.

## Routing & i18n

All app routes live under [app/[locale]/](app/[locale]/) — the `[locale]` segment is enforced by [proxy.ts](proxy.ts) (formerly `middleware.ts`; renamed for Next.js 16) using `createMiddleware` from next-intl. `app/layout.tsx` does not exist; the root layout is [app/[locale]/layout.tsx](app/[locale]/layout.tsx), which sets `<html lang>` and wraps children in `NextIntlClientProvider` and the `next-themes` provider ([app/providers.tsx](app/providers.tsx)).

i18n wiring:
- [i18n/routing.ts](i18n/routing.ts) — single source of truth for the locale list (`defineRouting`)
- [i18n/request.ts](i18n/request.ts) — server-side message loader, wired into [next.config.ts](next.config.ts) via `createNextIntlPlugin`
- [i18n/navigation.ts](i18n/navigation.ts) — locale-aware `Link`, `useRouter`, `usePathname` wrappers — **use these instead of `next/link` and `next/navigation`** inside the app
- [messages/](messages/) — translation JSON per locale; keys are namespaced (e.g. `Home.greeting`)

Server components call `setRequestLocale(locale)` and use `getTranslations`; client components use `useTranslations`.

The Playwright config sets `webServer.command` to `npm run dev -- --port 3100` and `testDir: ./e2e`. The [e2e/](e2e/) directory has its own [tsconfig.json](e2e/tsconfig.json) so its `@playwright/test` `expect` doesn't collide with Vitest's in the rest of the project.

## Superpowers workflow

The `superpowers` plugin is installed at user scope and its skills auto-load — follow them.

- For any non-trivial feature, start with `superpowers:brainstorming` to nail the spec before writing code. Don't jump straight to implementation.
- Once the spec is clear, use `superpowers:writing-plans` to produce a plan, then `superpowers:executing-plans` (or `superpowers:subagent-driven-development` for in-session multi-task work).
- Implementation defaults to red/green TDD via `superpowers:test-driven-development`; bugs go through `superpowers:systematic-debugging`.
- Before claiming work complete, use `superpowers:verification-before-completion` (run lint/test/build and report actual output).
- Use [.claude/worktrees/](.claude/worktrees/) via `superpowers:using-git-worktrees` for isolated feature work — keeps `main` clean while a feature is in flight.
- Project-local skills under [.claude/skills/](.claude/skills/) (`commit`, `new-ui-component`, `new-web-page`, `pr-description`) complement the superpowers set.

## Notes

- Next.js 16 is past most training data — when uncertain about an API (route handlers, caching, `params`/`searchParams` shape, server actions, config, the `proxy` file convention), read the relevant guide in `node_modules/next/dist/docs/` first.
- The `mounted` flag + `useEffect` pattern in [features/theme-switcher/ui/theme-switcher.tsx](features/theme-switcher/ui/theme-switcher.tsx) is the canonical `next-themes` hydration-safe pattern; the `react-hooks/set-state-in-effect` ESLint rule is intentionally suppressed there.
- `public/` is intentionally empty — the create-next-app demo assets were removed.
