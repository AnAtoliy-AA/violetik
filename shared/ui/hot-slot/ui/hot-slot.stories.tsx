import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HotSlot } from "./hot-slot";

const meta: Meta<typeof HotSlot> = {
  title: "shared/ui/HotSlot",
  component: HotSlot,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["last-one", "popular", "new"] },
  },
  args: { variant: "popular" },
};
export default meta;
type Story = StoryObj<typeof HotSlot>;

export const LastOne: Story = { args: { variant: "last-one" } };
export const Popular: Story = { args: { variant: "popular" } };
export const New: Story = { args: { variant: "new" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-3 flex-wrap">
      <HotSlot variant="last-one" />
      <HotSlot variant="popular" />
      <HotSlot variant="new" />
    </div>
  ),
};

export const CustomLabel: Story = {
  args: { variant: "popular", label: "MOST BOOKED" },
};
