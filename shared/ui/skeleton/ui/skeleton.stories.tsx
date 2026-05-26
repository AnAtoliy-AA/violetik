import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "shared/ui/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["line", "rect", "circle"] },
    lines: { control: { type: "number", min: 1, max: 6 } },
    size: { control: { type: "number", min: 16, max: 200 } },
  },
  parameters: {
    backgrounds: { default: "aubergine" },
  },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Line: Story = {
  args: { variant: "line", lines: 1, className: "w-72" },
};

export const MultilineParagraph: Story = {
  args: { variant: "line", lines: 4, className: "w-80" },
};

export const Rect: Story = {
  args: { variant: "rect", className: "w-72 aspect-[4/5]" },
};

export const Circle: Story = {
  args: { variant: "circle", size: 56 },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-80">
      <Skeleton variant="line" lines={3} />
      <Skeleton variant="rect" className="aspect-[4/5]" />
      <Skeleton variant="circle" size={56} />
    </div>
  ),
};
