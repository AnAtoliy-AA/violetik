# Auto-apply DB migrations on merge to `develop` / `main`

**Date:** 2026-05-30
**Status:** Approved (design)

## Problem

Drizzle migrations live in [db/migrations/](../../../db/migrations) and are applied
with `npm run db:migrate` (`drizzle-kit migrate`, runs against `DIRECT_URL`).
Today that is a manual step. When a branch is merged to `develop` (staging) or
`main` (production), the schema can drift from the deployed code until someone
remembers to run the migration by hand. We want migrations applied
automatically — and only after the code passing CI is on the branch.

## Goals

- On merge/push to `develop`, apply pending migrations to the **staging** DB.
- On merge/push to `main`, apply pending migrations to the **production** DB.
- Never migrate a commit that failed CI (lint / Vitest / build).
- Never migrate on pull-request runs — only on the post-merge push.
- Keep production credentials and (optionally) a manual approval gate isolated
  in GitHub Environments.

## Non-goals

- No rollback / down-migration automation (Drizzle migrations are forward-only;
  reverts are handled by writing a new migration).
- No change to the runtime DB connection (`DATABASE_URL`, pooled port 6543) —
  migrations use `DIRECT_URL` (direct port 5432), as configured in
  [drizzle.config.ts](../../../drizzle.config.ts).
- No change to the existing [.github/workflows/ci.yml](../../../.github/workflows/ci.yml).

## Approach

A new standalone workflow, `.github/workflows/migrate.yml`, gated on the
existing `CI` workflow succeeding.

### Trigger

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main, develop]
```

`workflow_run` fires when the `CI` workflow (defined on the default branch)
completes for `main` or `develop`. The migrate job then guards on:

- `github.event.workflow_run.conclusion == 'success'` — CI passed, and
- `github.event.workflow_run.event == 'push'` — this was a merge/push, not a
  pull-request CI run.

This is the idiomatic way for one workflow to depend on another workflow's
success while living in its own file.

### Branch → environment → database

| Branch    | GitHub Environment | Database               |
| --------- | ------------------ | ---------------------- |
| `develop` | `staging`          | staging Supabase project    |
| `main`    | `production`       | production Supabase project |

The job selects its environment by expression:

```yaml
environment: ${{ github.event.workflow_run.head_branch == 'main' && 'production' || 'staging' }}
```

Because the job references an environment, `secrets.DIRECT_URL` resolves to that
environment's secret. No branching logic for secret names is needed.

### Job steps

1. `actions/checkout@v4` with `ref: ${{ github.event.workflow_run.head_sha }}`
   — check out the exact merged commit, not the default branch tip.
2. `actions/setup-node@v4` — Node `22`, `cache: npm` (matches CI).
3. `npm ci`.
4. `npm run db:migrate` with `env: DIRECT_URL: ${{ secrets.DIRECT_URL }}`.

`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` is set at the workflow `env` level,
mirroring CI's early opt-in for Node 24 JavaScript actions.

No change to `drizzle.config.ts` is required: it loads `.env.local` via dotenv
(absent in CI, harmless) and falls back to `process.env.DIRECT_URL`, which the
workflow supplies.

### Workflow sketch

```yaml
name: DB migrate

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main, develop]

permissions:
  contents: read

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  migrate:
    name: Apply Drizzle migrations
    runs-on: ubuntu-latest
    timeout-minutes: 10
    if: >-
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'push'
    environment: ${{ github.event.workflow_run.head_branch == 'main' && 'production' || 'staging' }}
    steps:
      - name: Checkout merged commit
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Apply migrations
        run: npm run db:migrate
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

## One-time GitHub setup (manual, outside this repo)

These cannot be done from the workflow file and must be configured in the repo's
GitHub settings:

1. **Settings → Environments → New environment**: create `staging` and
   `production`.
2. In each, add an **environment secret** named `DIRECT_URL` set to that
   environment's Supabase **direct** connection string (port 5432).
3. **Recommended:** on the `production` environment, add **Required reviewers**
   so a human must approve before production migrations run. Migrations are
   forward-only and can be destructive; a one-click approval is cheap insurance.
   (Staging can run unattended.)

## Error handling & edge cases

- **CI fails** → migrate job is skipped (the `if` guard is false). Schema is not
  touched.
- **PR CI run completes** → `event != 'push'`, job skipped. PRs never migrate.
- **No pending migrations** → `drizzle-kit migrate` is a no-op and exits 0.
- **Migration fails** → job fails red and is visible in Actions; the deploy and
  DB are left for manual inspection. No automatic rollback (by design).
- **Direct push to `develop`/`main`** (no PR) → CI runs on the push, and on
  success migrate runs. Same path as a merge.

## Testing / verification

- `actionlint` (or GitHub's workflow parser on push) validates YAML syntax.
- First real validation is the initial merge to `develop`: confirm the
  `DB migrate` workflow appears in Actions, selects the `staging` environment,
  and `db:migrate` reports applied/skipped migrations.
- Production path is exercised on the first `develop → main` merge, gated by the
  optional required-reviewer prompt.
