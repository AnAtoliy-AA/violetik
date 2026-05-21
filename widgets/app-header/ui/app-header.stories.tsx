import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppHeader } from "./app-header";

const meta: Meta<typeof AppHeader> = {
  title: "widgets/AppHeader",
  component: AppHeader,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Top chrome for tab-bar screens: the small wordmark on the left and a hamburger menu button on the right. The menu button is a non-functional placeholder until the navigation drawer is wired in a later PR — `menuButton` lets a slot override that default.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AppHeader>;

export const Default: Story = {};

export const DetailScreen: Story = {
  args: { back: "/services", title: "PLATE · 02" },
  parameters: {
    docs: {
      description: {
        story:
          "Detail-screen variant: back arrow replaces the wordmark on the left, a centred mono-caps title replaces nothing visually (it's absolutely positioned over the row). Used by the Service detail screen and any future detail/edit views.",
      },
    },
  },
};
