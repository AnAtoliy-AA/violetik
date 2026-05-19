---
name: pr-description
description: Write a pull request description and open the PR via `gh`. Use when creating a PR or summarizing branch changes for review.
---

## Gather the facts first

Do these in parallel before drafting anything:

```bash
git status                      # uncommitted work? abort the PR or commit first
git log main..HEAD --oneline    # every commit on the branch (not just the latest!)
git diff main...HEAD            # full branch diff vs the merge base
gh pr list --head $(git branch --show-current)  # is there already a PR?
```

Read **every** commit on the branch, not just the most recent. The PR description must reflect the whole branch's scope.

## Format

```
## Summary
<1–3 bullets covering what changed at a glance>

## Why
<Short paragraph or bullets: the motivation. Reference the issue/ticket if there is one (Closes #123 / Refs VIO-456).>

## Changes
- Group related changes; one bullet per area
- Call out renames, deletions, dependency bumps explicitly
- Don't restate every file — describe behavior shifts

## Test plan
- [ ] `npm run lint` passes
- [ ] `npm test` passes (default + storybook projects)
- [ ] `npm run build` passes
- [ ] `npm run e2e` passes (mention skipped specs if any)
- [ ] Manual: <visit /en/<route>, click X, expect Y>
- [ ] (if UI) Storybook story updated; addon-a11y panel clean

## Screenshots / video
<Drop in if the change is visible; otherwise delete this section.>
```

Tailor every section. Delete sections that don't apply rather than leaving placeholder text.

## Title

- Conventional Commits format, same shape as commits: `<type>(<scope>): <subject>`
- ≤ 70 chars (GitHub truncates beyond that in lists)
- Subject describes the branch's *outcome*, not the implementation detail

Examples:

```
feat(features/locale-switcher): add Belarusian locale and switcher control
refactor(shared/ui): migrate components folder into FSD layout
chore(ci): add Husky pre-commit + pre-push hooks
```

## Open the PR

Push first if the branch isn't on origin, then use heredoc to preserve formatting:

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- …

## Why
…

## Changes
- …

## Test plan
- [ ] …

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user when done.

## Rules

- **Never force-push to `main`/`develop`/`staging`**. Force-push to your own feature branch is fine when you rewrote local history; mention it in the PR comments so reviewers re-pull.
- **One PR, one concern**. If the branch genuinely covers two unrelated changes, split it. (See `superpowers:finishing-a-development-branch` for guidance.)
- **Don't auto-merge**. Wait for review unless the user explicitly asks.
- **Hooks already ran on push** (`pre-push` builds). If the PR is on origin, the build at HEAD was already green locally — but CI is the source of truth, not your local hook.

## Checklist

- [ ] Read every commit on the branch, not just the latest
- [ ] Title is Conventional-Commits-shaped and ≤ 70 chars
- [ ] Summary, Why, Changes, Test plan sections present (and unused sections removed)
- [ ] Linked the issue/ticket if any (`Closes #N`)
- [ ] Test plan reflects what was *actually* run, not aspirations
- [ ] PR URL reported back to the user
