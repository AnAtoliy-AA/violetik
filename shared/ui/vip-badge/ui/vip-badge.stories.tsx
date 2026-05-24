import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VipBadge } from "./vip-badge";

const meta: Meta<typeof VipBadge> = {
  title: "shared/ui/VipBadge",
  component: VipBadge,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["xs", "sm"] },
    label: { control: "text" },
  },
  args: { label: "VIP", size: "sm" },
};
export default meta;
type Story = StoryObj<typeof VipBadge>;

export const Default: Story = {};
export const ExtraSmall: Story = { args: { size: "xs" } };
export const NextToName: Story = {
  render: (args) => (
    <span className="inline-flex items-center gap-2 font-display text-[18px] italic">
      Anatoli A. <VipBadge {...args} />
    </span>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <VipBadge size="xs" />
      <VipBadge size="sm" />
    </div>
  ),
};
