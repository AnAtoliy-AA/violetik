import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { RefreshButton } from "./refresh-button";

const meta: Meta<typeof RefreshButton> = {
  title: "shared/ui/RefreshButton",
  component: RefreshButton,
  tags: ["autodocs"],
  args: { ariaLabel: "Refresh" },
};
export default meta;
type Story = StoryObj<typeof RefreshButton>;

export const Default: Story = {};
export const VisibilityRefreshDisabled: Story = {
  args: { disableVisibilityRefresh: true },
};
