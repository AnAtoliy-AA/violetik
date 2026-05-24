# Onboarding

A private nail-atelier web app — Next.js 16 · React 19 · Tailwind v4 · TypeScript · next-intl path-prefix routing across `en` / `ru` / `be`. Built top-down from a static design spec ([docs/handsoff/start.md](docs/handsoff/start.md)); everything visible on the site is a port of that handoff.

## Quick start

```bash
git clone https://github.com/AnAtoliy-AA/violetik.git
cd violetik
npm ci                # NOT npm install — lockfile is pinned, see notes
npm run dev           # http://localhost:3000
```

Open `/` and you'll be redirected to `/en/welcome`. From there the four tab-bar screens (`/home`, `/services`, `/gallery`, `/profile`) are wired together; everything else (`/welcome`, `/onboarding`, `/master`, `/membership`, `/booking/*`, `/admin`) is reachable from the in-app navigation.

## Daily commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build (also runs the TypeScript checker — no separate `tsc` needed) |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint flat config |
| `npm test` | Vitest, single pass. Runs **both** the jsdom unit suite and the Storybook addon-vitest browser project (every story is a test) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run e2e` | Playwright e2e — **stop any running `next dev` first**, Next.js 16 enforces one dev server per project and `playwright.config.ts` boots its own on port 3100 |
| `npm run e2e:ui` | Playwright UI mode |
| `npm run storybook` | Storybook dev on port 6006 |
| `npm run build-storybook` | Storybook static build |

Single Vitest file: `npx vitest run path/to/file.test.tsx`.
Single Playwright spec: `npx playwright test e2e/home.spec.ts`.

## Architecture — Feature-Sliced Design

Imports may only point **downward**:

| Layer | Folder | Purpose |
|---|---|---|
| app | `app/` | Next.js App Router routes + global init (root layout, providers, generateMetadata, opengraph-image) |
| views | `views/` | Page-level compositions (FSD `pages` renamed to avoid Next's legacy Pages Router clash) |
| widgets | `widgets/` | Large self-contained UI blocks (e.g. `app-header`, `tab-bar`, `booking-stepper`) |
| features | `features/` | User actions / interactive units (`locale-switcher`, `site-settings-admin`) |
| entities | `entities/` | Business entities (`studio`, `service`) |
| shared | `shared/` | UI primitives, utility libs, config — no business logic |

Every slice exposes a single public API via `index.ts`. Inside a slice, organize by segment: `ui/`, `model/`, `lib/`, `api/`. **Never deep-import another slice's internals** — go through its root.

## Routing & i18n

- Locale lives in the URL: `/en/...`, `/ru/...`, `/be/...`. Locale list and defaults in [i18n/routing.ts](i18n/routing.ts).
- Middleware-equivalent is [proxy.ts](proxy.ts) (Next.js 16 renamed `middleware.ts` → `proxy.ts`).
- Translations in [messages/](messages/) — flat namespaced JSON, one file per locale, identical key sets across all three.
- **Use the wrappers in [i18n/navigation.ts](i18n/navigation.ts)** (`Link`, `useRouter`, `usePathname`) instead of `next/link` / `next/navigation`. The wrappers preserve locale.

Server components: call `setRequestLocale(locale)` first, then `getTranslations`. Client components: `useTranslations`.

## Theming

Twelve dark palettes — Aubergine (default), Rose, Lilac, Mono, Ink, Moss, Bronze, Pearl, Emerald, Sapphire, Ruby, Obsidian.

- Registry: [shared/config/palettes/palettes.ts](shared/config/palettes/palettes.ts)
- Each palette is a `:root[data-palette="…"]` block in [app/globals.css](app/globals.css) overriding the @theme color tokens
- Active palette: a site-wide admin setting. The locale layout reads `settings.defaultPalette` from the database via `getSiteSettingsServer()` and SSRs `<html data-palette="…">`. No cookie, no inline script — every page load reflects the current site-wide value.
- Admin picks the palette at `/[locale]/admin/site-settings` (alongside default locale and pricing). The polished pill picker is inline inside `features/site-settings-admin/`.

## Branch + PR workflow

- `main` is production. `develop` is integration. Feature branches off `develop`.
- Husky enforces locally: `pre-commit` runs `lint` + `test`; `pre-push` runs `build`. **Don't `--no-verify`** — fix the underlying issue.
- CI on every push to `main`/`develop` and every PR runs three jobs in [.github/workflows/ci.yml](.github/workflows/ci.yml): `verify` (lint + Vitest + build), `e2e` (Playwright), and `lighthouse` (perf budgets on three URLs). The last two run in parallel after `verify`.
- PRs target `develop`, not `main`. Use the [commit](.claude/skills/commit/SKILL.md) and [pr-description](.claude/skills/pr-description/SKILL.md) project skills for message shape.

## Adding things

Use the project skills under [.claude/skills/](.claude/skills/) — they're written for this codebase, not generic FSD or Next.js docs:

- [new-ui-component](.claude/skills/new-ui-component/SKILL.md) — primitives in `shared/ui/`, features in `features/<name>/ui/`. Tailwind only, mandatory Storybook story, mandatory Vitest test.
- [new-web-page](.claude/skills/new-web-page/SKILL.md) — locale-prefixed route + `setRequestLocale` + translations in all three locale files + e2e spec.
- [commit](.claude/skills/commit/SKILL.md) — Conventional Commits with FSD-scoped scopes.
- [pr-description](.claude/skills/pr-description/SKILL.md) — PR body shape.

The reference primitive is [shared/ui/button/](shared/ui/button/) — copy its structure for new primitives.

## Database (Supabase + Drizzle)

Postgres on Supabase; Drizzle ORM for the schema + a tiny CLI for migrations. Three tables today: `users` (one row per Telegram signer), `bookings`, `availability_rules`. See [db/schema.ts](db/schema.ts) for the canonical declaration.

Daily commands:

```bash
npm run db:generate   # diff schema.ts vs db/migrations/*, emit a new SQL file
npm run db:migrate    # apply pending migrations to DIRECT_URL
npm run db:studio     # open Drizzle Studio web UI to inspect rows
```

`db:generate` is purely local (reads `db/schema.ts`, no DB connection). `db:migrate` and `db:studio` connect to the Postgres at `DIRECT_URL`. All three load env from `.env.local` via [drizzle.config.ts](drizzle.config.ts).

First-time setup after cloning:

```bash
# 1. paste DATABASE_URL + DIRECT_URL from Supabase into .env.local
# 2. apply the existing migrations
npm run db:migrate
```

When you change `db/schema.ts`:

```bash
npm run db:generate   # creates db/migrations/NNNN_<name>.sql — commit it
npm run db:migrate    # apply to your dev DB
```

The client at [db/index.ts](db/index.ts) returns `null` when `DATABASE_URL` is unset, so the codebase degrades gracefully in environments without a DB (CI, local dev pre-Supabase). On every sign-in the Telegram authorize callback calls [db/users.ts](db/users.ts) `upsertTelegramUser()` — idempotent, no-op when `db === null`.

## Auth (Telegram)

Sign-in is via Telegram Login Widget. The gate on `/admin` activates the moment `TELEGRAM_BOT_TOKEN` is set; without it (local dev / CI) the admin page stays open.

Setup, one-time:

1. **Create a bot** — Telegram → @BotFather → `/newbot`. Pick a name (e.g. "Violetta Beauty Studio") and a username ending in `bot`. Copy the token.
2. **Authorize the domain** — same chat: `/setdomain` → pick the bot → send `localhost` (add the prod domain via the same command after deploying).
3. **Generate a JWT secret** — `openssl rand -base64 32`.
4. **Populate `.env.local`** — copy from [.env.example](.env.example) and fill `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`. Already-set `DATABASE_URL` and `DIRECT_URL` are for the next phase (DB).

Implementation:

- [auth.ts](auth.ts) — Auth.js v5 with a `Credentials` provider for Telegram. `authorize()` verifies the HMAC against the bot token per [Telegram's spec](https://core.telegram.org/widgets/login#checking-authorization) (data-check string, sha256(bot_token) as HMAC key, 24-hour replay window).
- [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts) — Auth.js handlers.
- [features/telegram-login/](features/telegram-login/) — client widget (`TelegramLogin`) + server-action sign-out (`SignOutButton`).
- [app/[locale]/sign-in/page.tsx](app/[locale]/sign-in/page.tsx) — sign-in screen.
- Sessions are JWT-only (no DB yet); user `id` is `tg:<telegram_user_id>`.

## Google Calendar (admin)

The admin connects her Google Calendar from `/admin/integrations/google`. We read free/busy windows to compute booking slots — we do **not** create, modify, or delete events. Scope is `calendar.readonly` only.

Setup, one-time:

1. **Cloud project** — [console.cloud.google.com](https://console.cloud.google.com) → create project. Enable the **Google Calendar API** under APIs & Services → Library.
2. **OAuth consent screen** — APIs & Services → OAuth consent screen → External. Add scopes `openid`, `email`, `https://www.googleapis.com/auth/calendar.readonly`. Add Violetta's Google address as a test user while the app is in testing.
3. **OAuth Client ID** — APIs & Services → Credentials → Create credentials → OAuth client → Web application. Authorized redirect URI: `https://<your-host>/api/integrations/google/callback`. Copy Client ID + Client Secret.
4. **Vercel env vars** — set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (matches step 3 exactly), and optionally `GOOGLE_CALENDAR_ID` (default `primary`) and `NEXT_PUBLIC_BOOKING_TIMEZONE` (default `Europe/Minsk`). Redeploy.
5. **Connect** — sign in as the admin, visit `/admin/integrations/google`, click "Connect Google Calendar", complete the Google consent. After redirect the page shows the connected email.

Implementation:

- [shared/lib/google-calendar/](shared/lib/google-calendar/) — pure: OAuth helpers (`buildAuthUrl`, `exchangeCode`, `refreshAccessToken`, `revokeToken`), `fetchBusyWindows`, `computeAvailableSlots` (DST-safe).
- [db/google-tokens.ts](db/google-tokens.ts) — only place that reads/writes `google_oauth_tokens`.
- [features/google-calendar-connect/](features/google-calendar-connect/) — admin UI + `startGoogleOAuth` / `disconnectGoogleCalendar` server actions.
- [app/api/integrations/google/callback/route.ts](app/api/integrations/google/callback/route.ts) — OAuth redirect target with CSRF + Auth.js session check.
- [app/api/booking/slots/route.ts](app/api/booking/slots/route.ts) — `GET ?date=YYYY-MM-DD&serviceId=...`, 60s in-memory LRU cache, static fallback when no token row exists.

Security note: refresh tokens are stored plaintext in `google_oauth_tokens`. They never leave the server (the slot endpoint returns only computed slot strings). Access goes through the Supabase service-role connection; Row-Level Security keeps client SQL out. Rotate by clicking "Disconnect" → "Connect" again.

## Deploy notes

The repo is environment-agnostic but expects these env vars in production. See [.env.example](.env.example) for the full list with comments.

- `NEXT_PUBLIC_SITE_URL` — absolute origin (e.g. `https://violetta.studio`). Used by [app/sitemap.ts](app/sitemap.ts), [app/robots.ts](app/robots.ts), the OG metadata in [app/[locale]/layout.tsx](app/[locale]/layout.tsx), and the canonical/hreflang alternates. Without it, those URLs publish a placeholder host (`https://violetta.example.com`) and crawlers won't find the real domain.
- `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` — required for the auth gate to activate.
- `AUTH_TRUST_HOST=true` — required on non-Vercel hosts.
- `DATABASE_URL`, `DIRECT_URL` — Supabase Postgres (used by upcoming bookings + availability work).

## Notes & pitfalls

- **Next.js 16 is past most training data.** When uncertain about an API (route handlers, caching, `params`/`searchParams` shape, server actions, config, the `proxy` file convention), read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
- **Tailwind v4 has no JS config.** All design tokens live in [app/globals.css](app/globals.css) inside `@theme {}`. The dark-mode `@custom-variant` is still wired even though every palette is dark — it's there for forward compatibility.
- **`params` is a Promise.** Next 15+ async params; always `await` them.
- **`STUDIO_DATA` is stub content** ([entities/studio/model/data.ts](entities/studio/model/data.ts)), waiting for the prototype HTML to land. Shape is final; values are placeholders.
- **Tab bar is absent** on detail / booking / onboarding / welcome / master / membership / confirmation screens — that's by spec, not an oversight.
- **`npm ci` vs `npm install`**: prefer `npm ci` in CI / fresh clones — the lockfile is platform-aware and pins transitives (`@swc/helpers`, etc.) we ran into across macOS arm64 / Linux x64.
- Tests for components that pull `usePathname` from `@/i18n/navigation` need a mock — see [views/profile/ui/profile-page.test.tsx](views/profile/ui/profile-page.test.tsx) for the canonical pattern.

## More

- [CLAUDE.md](CLAUDE.md) — codebase guide for AI sessions (also useful as a more detailed reference for humans)
- [AGENTS.md](AGENTS.md) — short note about Next.js 16 breaking changes
- [docs/handsoff/start.md](docs/handsoff/start.md) — the design spec the whole site builds against
- [docs/superpowers/plans/](docs/superpowers/plans/) — implementation plans (Plan 1: foundation design system landed)
