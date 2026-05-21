import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Aurora } from "./aurora";

const meta: Meta<typeof Aurora> = {
  title: "shared/ui/Aurora",
  component: Aurora,
  tags: ["autodocs"],
  argTypes: {
    intensity: { control: "select", options: ["subtle", "vivid"] },
  },
};
export default meta;

type Story = StoryObj<typeof Aurora>;

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl bg-bg">
      {children}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-3">
          AURORA — palette-aware
        </p>
        <p className="font-display italic text-5xl text-text">Violetik</p>
        <p className="text-sm text-text-2">
          Try the palette switcher in the Storybook toolbar.
        </p>
      </div>
    </div>
  );
}

export const Subtle: Story = {
  args: { intensity: "subtle" },
  render: (args) => (
    <Stage>
      <Aurora {...args} />
    </Stage>
  ),
};

export const Vivid: Story = {
  args: { intensity: "vivid" },
  render: (args) => (
    <Stage>
      <Aurora {...args} />
    </Stage>
  ),
};
