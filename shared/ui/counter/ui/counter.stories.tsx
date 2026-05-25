import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Counter } from "./counter";

const meta: Meta<typeof Counter> = {
  title: "shared/ui/Counter",
  component: Counter,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "number" } },
    duration: { control: { type: "number", step: 0.1 } },
    minDigits: { control: { type: "number", min: 1, max: 6 } },
    suffix: { control: "text" },
  },
  args: { value: 612, duration: 1.4 },
};
export default meta;
type Story = StoryObj<typeof Counter>;

export const Default: Story = {
  render: (args) => (
    <span className="font-display text-5xl">
      <Counter {...args} />
    </span>
  ),
};

export const Plus: Story = {
  args: { value: 600, suffix: "+" },
  render: (args) => (
    <span className="font-display text-5xl">
      <Counter {...args} />
    </span>
  ),
};

export const Years: Story = {
  args: { value: 11 },
  render: (args) => (
    <span className="font-display italic text-6xl text-gold">
      <Counter {...args} />
      <span className="ml-2 font-mono text-xs uppercase tracking-[0.3em] text-text-3">
        years
      </span>
    </span>
  ),
};
