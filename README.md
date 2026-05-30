# Violetik

A private nail-atelier web app — **Next.js 16 · React 19 · Tailwind v4 · TypeScript**, with
**next-intl** path-prefix routing across `en` / `ru` / `be`, **next-auth** (Telegram login),
**Drizzle ORM + Supabase Postgres**, and **Vercel** hosting. Architecture follows
[Feature-Sliced Design](https://feature-sliced.github.io/documentation/).

> New here? This README is the map. For the deep tour of every subsystem read
> [ONBOARDING.md](ONBOARDING.md); for the AI-session codebase guide read [CLAUDE.md](CLAUDE.md).

---

## Quick start

```bash
git clone https://github.com/AnAtoliy-AA/violetik.git
cd violetik
npm ci                       # NOT npm install — the lockfile is pinned (see ONBOARDING.md)
cp .env.example .env.local   # then fill in values (see Environment variables)
npm run db:migrate           # apply existing migrations to your DATABASE/DIRECT_URL
npm run dev                  # http://localhost:3000  → redirects to /en/welcome
```

The app degrades gracefully without a database or auth bot configured: the DB client
returns `null` (see [db/index.ts](db/index.ts)) and the `/admin` gate stays open until
`TELEGRAM_BOT_TOKEN` is set — so you can run `npm run dev` against a bare `.env.local`.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build (also runs the TypeScript checker) |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint ([eslint.config.mjs](eslint.config.mjs)) |
| `npm test` | Vitest single run — jsdom unit suite **and** the Storybook browser project (every story is a test) |
| `npm run test:watch` | Vitest watch mode |
| `npm run e2e` | Playwright e2e (boots its own dev server on port 3100 — stop any running `next dev` first) |
| `npm run e2e:ui` | Playwright UI runner |
| `npm run storybook` | Storybook dev on port 6006 |
| `npm run build-storybook` | Storybook static build |
| `npm run db:generate` | Diff `db/schema.ts` vs `db/migrations/*`, emit a new SQL migration (local, no DB) |
| `npm run db:migrate` | Apply pending migrations to `DIRECT_URL` |
| `npm run db:studio` | Open Drizzle Studio to inspect rows |

Single test file: `npx vitest run path/to/file.test.tsx` · single spec: `npx playwright test e2e/home.spec.ts`.

**Husky hooks** (don't `--no-verify` — fix the cause instead): `pre-commit` runs `lint` + `test`;
`pre-push` runs `build`.

---

## Environment variables

Copy [.env.example](.env.example) to `.env.local` (gitignored) and fill in real values.
`.env.example` carries inline comments for each one.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | prod | Absolute origin for sitemap, robots, OG metadata, canonical/hreflang |
| `DATABASE_URL` | runtime | Supabase **pooled** connection (port 6543, `?pgbouncer=true`) — used by the app at runtime / on Vercel serverless |
| `DIRECT_URL` | migrations | Supabase **direct** connection (port 5432) — used by `drizzle-kit` for migrations & studio |
| `AUTH_SECRET` | prod | Auth.js JWT secret — `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | non-Vercel | `true` on local dev / self-host |
| `TELEGRAM_BOT_TOKEN` | for auth gate | @BotFather token; activates the `/admin` gate when set |
| `TELEGRAM_BOT_USERNAME` | for auth gate | Bot username (ends in `bot`), no `@` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | calendar | Google Cloud OAuth Web client |
| `GOOGLE_OAUTH_REDIRECT_URI` | calendar | Must match an Authorized redirect URI exactly |
| `GOOGLE_CALENDAR_ID` | optional | Calendar to read free/busy from (default `primary`) |
| `NEXT_PUBLIC_BOOKING_TIMEZONE` | optional | IANA TZ for booking slots (default `Europe/Minsk`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | web push | `npx web-push generate-vapid-keys` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | web push | Public copy of the VAPID public key for `PushManager.subscribe` |
| `VAPID_SUBJECT` | web push | Contact URI (`mailto:`) per RFC 8292 |
| `CRON_SECRET` | prod cron | Guards the booking-reminders cron route; Vercel sets it automatically on deploy |

`drizzle.config.ts` loads `.env.local` itself and uses `DIRECT_URL` (falling back to
`DATABASE_URL`). In CI / on the migration workflow no `.env.local` exists, so `DIRECT_URL`
is read straight from the environment.

---

## CI/CD

### `CI` — [.github/workflows/ci.yml](.github/workflows/ci.yml)

Runs on every push to `main` / `develop` and on every pull request to them. Three jobs:

| Job | Runs |
|---|---|
| `verify` | `npm run lint` → `npm test` (unit + Storybook story tests) → `npm run build` |
| `e2e` | Playwright e2e against a Postgres service container with migrations applied (`needs: verify`) |
| `lighthouse` | Lighthouse CI perf budgets on three URLs (`needs: verify`) |

Node 22; in-flight runs are cancelled when a new commit lands on the same ref.

### `DB migrate` — [.github/workflows/migrate.yml](.github/workflows/migrate.yml)

Automatically applies Drizzle migrations **after a merge/push lands and its CI run goes
green**. Design doc: [docs/superpowers/specs/2026-05-30-ci-db-migrate-on-merge-design.md](docs/superpowers/specs/2026-05-30-ci-db-migrate-on-merge-design.md).

- **Trigger:** `workflow_run` on the `CI` workflow completing for `main` / `develop`.
- **Guards:** runs only when CI `conclusion == 'success'` **and** the event was a `push`
  (so pull-request CI runs never migrate).
- **Branch → database:**

  | Branch | GitHub Environment | Database |
  |---|---|---|
  | `develop` | `staging` | staging Supabase project |
  | `main` | `production` | production Supabase project |

- **What it does:** checks out the exact validated commit (`workflow_run.head_sha`),
  `npm ci`, then `npm run db:migrate` with `DIRECT_URL` taken from the selected
  environment's secret. No-op (exit 0) when nothing is pending.

#### One-time GitHub setup

These live in GitHub repo settings, not in the workflow file:

1. **Settings → Environments → New environment** — create `staging` and `production`.
2. In **each**, add an **environment secret** named **`DIRECT_URL`** = that environment's
   Supabase **direct** connection string (port 5432).
3. **Recommended:** on `production`, add **Required reviewers** so a human approves before
   production migrations run. Migrations are forward-only and can be destructive — a
   one-click approval is cheap insurance. Staging can run unattended.

> The `workflow_run` trigger only fires for the copy of `CI` on the **default branch**
> (`main`), so keep `ci.yml`'s `name: CI` stable.

### Hosting (Vercel)

Deployed on Vercel. The booking-reminders cron is declared in [vercel.json](vercel.json)
(`0 8 * * *`). Set all production env vars in the Vercel project; `CRON_SECRET` is injected
automatically.

---

## Onboarding

Full walkthrough: **[ONBOARDING.md](ONBOARDING.md)**. The essentials:

- **Architecture (FSD):** imports point only downward — `app → views → widgets → features →
  entities → shared`. Each slice exposes one public API via `index.ts`; never deep-import a
  slice's internals.
- **Routing & i18n:** locale lives in the URL (`/en`, `/ru`, `/be`); middleware-equivalent is
  [proxy.ts](proxy.ts). Use the wrappers in [i18n/navigation.ts](i18n/navigation.ts), not
  `next/link` / `next/navigation`. Translations in [messages/](messages/), identical key sets
  per locale.
- **Theming:** twelve dark palettes (Aubergine default); active palette is a site-wide admin
  setting read from the DB and SSR'd onto `<html data-palette="…">`.
- **Database:** Drizzle + Supabase Postgres; schema in [db/schema.ts](db/schema.ts), migrations
  in [db/migrations/](db/migrations/). Change schema → `db:generate` (commit the SQL) →
  `db:migrate`.
- **Auth:** Telegram Login Widget via Auth.js v5 ([auth.ts](auth.ts)); the `/admin` gate
  activates once `TELEGRAM_BOT_TOKEN` is set.
- **Google Calendar (admin):** read-only free/busy to compute booking slots — see ONBOARDING.md
  for the OAuth setup.

### Branch & PR workflow

- `main` = production, `develop` = integration. **Feature branches off `develop`; PRs target
  `develop`** (not `main`).
- Use the project skills under [.claude/skills/](.claude/skills/): `new-ui-component`,
  `new-web-page`, `commit`, `pr-description`.

---

## More

- [ONBOARDING.md](ONBOARDING.md) — full subsystem-by-subsystem guide
- [CLAUDE.md](CLAUDE.md) — codebase guide for AI sessions (also a good human reference)
- [AGENTS.md](AGENTS.md) — note on Next.js 16 breaking changes
- [docs/handsoff/start.md](docs/handsoff/start.md) — the design spec the site builds against
- [docs/superpowers/specs/](docs/superpowers/specs/) — design docs · [docs/superpowers/plans/](docs/superpowers/plans/) — implementation plans
