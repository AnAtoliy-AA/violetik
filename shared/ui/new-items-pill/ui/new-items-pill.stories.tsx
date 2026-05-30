import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NewItemsPill } from "./new-items-pill";

const meta: Meta<typeof NewItemsPill> = {
  title: "shared/ui/NewItemsPill",
  component: NewItemsPill,
  tags: ["autodocs"],
  args: { count: 3, label: "3 new — refresh", onClick: () => {} },
};
export default meta;
type Story = StoryObj<typeof NewItemsPill>;

export const Default: Story = {};
export const One: Story = { args: { count: 1, label: "1 new — refresh" } };
export const Many: Story = { args: { count: 99, label: "99 new — refresh" } };
