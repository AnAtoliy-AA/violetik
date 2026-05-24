import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

import { SuggestedMerges } from "./suggested-merges";

const meta: Meta<typeof SuggestedMerges> = {
  component: SuggestedMerges,
  args: {
    title: "Suggested merges",
    reviewLabel: "Review merge",
    signalLabels: {
      email: "email match",
      photo: "photo match",
      name: "name match",
      "tg-google-handle": "handle match",
    },
  },
};
export default meta;
type Story = StoryObj<typeof SuggestedMerges>;
export const Empty: Story = { args: { candidates: [] } };
export const TwoPairs: Story = {
  args: {
    candidates: [
      {
        a: { id: "google:abc", displayName: "Violetta", photoUrl: null },
        b: { id: "tg:1", displayName: "Violetta", photoUrl: null },
        score: 6,
        signals: ["email", "name"],
      },
      {
        a: { id: "google:def", displayName: "Marina", photoUrl: null },
        b: { id: "tg:2", displayName: "Marina", photoUrl: null },
        score: 3,
        signals: ["photo"],
      },
    ],
  },
};
