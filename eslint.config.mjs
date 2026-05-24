// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Built Storybook output — generated, not source.
    "storybook-static/**",
    // Design-prototype reference (not part of the production build).
    "docs/**",
    // Git worktrees (each is a separate checkout with its own .next/
    // build artifacts; linting them re-lints generated JS).
    ".claude/worktrees/**",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
