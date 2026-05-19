import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: [
    "../shared/**/*.stories.@(ts|tsx|mdx)",
    "../entities/**/*.stories.@(ts|tsx|mdx)",
    "../features/**/*.stories.@(ts|tsx|mdx)",
    "../widgets/**/*.stories.@(ts|tsx|mdx)",
    "../views/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};
export default config;
