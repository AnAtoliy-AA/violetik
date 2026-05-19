import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tag } from "./tag";

const meta: Meta<typeof Tag> = {
  title: "shared/ui/Tag",
  component: Tag,
  tags: ["autodocs"],
  args: { children: "Editorial" },
  argTypes: {
    gold: { control: "boolean" },
    active: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const Gold: Story = { args: { gold: true } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag>All</Tag>
      <Tag active>Editorial</Tag>
      <Tag>Gel</Tag>
      <Tag gold>Featured</Tag>
    </div>
  ),
};
