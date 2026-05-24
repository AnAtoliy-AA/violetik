import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MagneticButton } from "./magnetic-button";
import { Button } from "@/shared/ui/button";

const meta: Meta<typeof MagneticButton> = {
  title: "shared/ui/MagneticButton",
  component: MagneticButton,
  tags: ["autodocs"],
  argTypes: {
    radius: { control: { type: "range", min: 40, max: 240, step: 10 } },
    strength: { control: { type: "range", min: 2, max: 24, step: 1 } },
  },
};
export default meta;

type Story = StoryObj<typeof MagneticButton>;

export const Gold: Story = {
  args: { radius: 120, strength: 8 },
  render: (args) => (
    <div className="grid place-items-center min-h-[260px]">
      <MagneticButton {...args}>
        <Button variant="gold" size="lg">
          Reserve a chair
        </Button>
      </MagneticButton>
    </div>
  ),
};

export const Outline: Story = {
  args: { radius: 90, strength: 6 },
  render: (args) => (
    <div className="grid place-items-center min-h-[260px]">
      <MagneticButton {...args}>
        <Button variant="outline" size="lg">
          Explore
        </Button>
      </MagneticButton>
    </div>
  ),
};
