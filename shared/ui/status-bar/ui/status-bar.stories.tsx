import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusBar } from "./status-bar";

const meta: Meta<typeof StatusBar> = {
  title: "shared/ui/StatusBar",
  component: StatusBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Prototype-only status bar (9:41 · VIOLETTA · OPEN · 5G). Delete from production routes — browsers ship their own chrome.",
      },
    },
  },
  argTypes: {
    time: { control: "text" },
    label: { control: "text" },
    signal: { control: "text" },
  },
};
export default meta;
type Story = StoryObj<typeof StatusBar>;

export const Default: Story = {};

export const Custom: Story = {
  args: { time: "11:30", label: "VIOLETTA · BOOKED", signal: "WIFI" },
};
