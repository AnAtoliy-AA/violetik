<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Pull requests

- **Always open PRs from `develop` and target `develop`.**
- Before opening a PR, run `git checkout develop && git pull origin develop` to ensure you have the latest upstream changes.
- Create a feature/fix branch from `develop`, do your work, then open the PR targeting `develop`.
- Never open PRs targeting `main`.
