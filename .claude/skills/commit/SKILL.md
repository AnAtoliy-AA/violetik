---
name: commit
description: Create a git commit following Conventional Commits. Use when committing changes. Respects this repo's Husky pre-commit hook (lint + Vitest) and pre-push hook (build).
---

## Format

```
<type>(<scope>): <subject>

<optional body explaining WHY>
```

- **type** — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **scope** — the FSD layer or area touched: `app`, `shared`, `features/<name>`, `widgets/<name>`, `entities/<name>`, `i18n`, `e2e`, `ci`, `deps`, `storybook`, `husky`. If a ticket exists, use the ticket id instead (e.g. `feat(VIO-123): …`). Omit the scope entirely if the change is global.
- **subject** — lowercase, imperative ("add" not "added"), no trailing period, header ≤ 72 chars.
- **body** — explain *why*. Skip if the subject is self-explanatory; never restate the diff.

Examples:

```
feat(features/locale-switcher): add Belarusian to the language list
fix(i18n): handle missing locale prefix by redirecting to default
refactor(shared/ui): move Button variants into a record map
chore(deps): bump next from 16.2.5 to 16.2.6
test(e2e): cover locale switch via switcher dropdown
```

## Steps

1. Run `git status` and `git diff --staged` to confirm what you're about to commit.
2. Stage **specific files** — never `git add -A` / `git add .`. That risks committing `.env*`, `.next/`, `storybook-static/`, editor state, or unrelated WIP.
3. Pick the type from the diff (a file rename without behavior change = `refactor`; adding a test = `test`; tweaking the README = `docs`).
4. Write the message via heredoc to keep formatting clean:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(features/theme-switcher): persist theme in cookie

   The previous setup stored the theme in localStorage, which made the SSR
   render flicker on first paint. Storing in a cookie lets the server read it.
   EOF
   )"
   ```

## Hooks will run — do not bypass

- **pre-commit** runs `npm run lint` + `npm test`. If it fails, the commit did **not** happen — fix the underlying issue, re-stage, and create a **new** commit. Never `--amend` (you'd be amending the previous, unrelated commit) and never `--no-verify`.
- **pre-push** runs `npm run build`. Build failures are blocking and signal a real type or config error.

If a hook is genuinely wrong (false positive), fix the hook in the same branch instead of skipping it for this one commit.

## Do not commit

- `.env*` files (a PreToolUse hook blocks reads, but be deliberate about not staging them either)
- `node_modules/`, `.next/`, `storybook-static/`, `playwright-report/`, `test-results/`
- IDE state, `.DS_Store`, scratch files
- Commented-out code, console.logs, stray debug helpers

## Checklist

- [ ] Diff reviewed; nothing unrelated is staged
- [ ] Conventional Commits format with appropriate `type(scope)`
- [ ] Subject ≤ 72 chars, imperative, lowercase
- [ ] Body present iff "why" isn't obvious from the subject
- [ ] No `--amend`, no `--no-verify`, no `git add .`
- [ ] Hooks ran and passed (don't claim the commit succeeded if they didn't)
