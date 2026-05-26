import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PressableSurface } from "./pressable-surface";

const meta: Meta<typeof PressableSurface> = {
  title: "shared/ui/PressableSurface",
  component: PressableSurface,
  tags: ["autodocs"],
  args: { noRipple: false },
};
export default meta;
type Story = StoryObj<typeof PressableSurface>;

export const Default: Story = {
  render: (args) => (
    <PressableSurface
      {...args}
      className="gilded p-4 w-64 flex-col gap-2 rounded-md"
    >
      <span className="font-display italic text-lg">Sculpture set</span>
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-2">
        · 90 min · 240 BYN ·
      </span>
    </PressableSurface>
  ),
};

export const NoRipple: Story = {
  args: { noRipple: true },
  render: (args) => (
    <PressableSurface
      {...args}
      className="gilded p-4 w-64 flex-col gap-2 rounded-md"
    >
      <span className="font-display italic text-lg">Quiet variant</span>
    </PressableSurface>
  ),
};

export const AsLink: Story = {
  args: { as: "a" },
  render: (args) => (
    <PressableSurface
      {...args}
      href="/booking/service"
      className="gilded p-4 w-64 flex-col gap-2 rounded-md no-underline"
    >
      <span className="font-display italic text-lg">Reserve</span>
    </PressableSurface>
  ),
};
