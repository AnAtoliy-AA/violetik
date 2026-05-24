import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

import { MergePicker } from "./merge-picker";

const meta: Meta<typeof MergePicker> = {
  component: MergePicker,
  args: {
    userId: "google:abc",
    placeholderLabel: "Select another user…",
    mergeWithLabel: "Merge with…",
    emptyLabel: "No other users to merge with.",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof MergePicker>;
export const Empty: Story = { args: { options: [] } };
export const ThreeOptions: Story = {
  args: {
    options: [
      { id: "tg:1", displayName: "Violetta" },
      { id: "tg:2", displayName: "Marina" },
      { id: "google:xyz", displayName: "Anna" },
    ],
  },
};
