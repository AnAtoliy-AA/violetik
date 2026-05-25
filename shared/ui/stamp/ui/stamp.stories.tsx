import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Stamp } from "./stamp";

const meta: Meta<typeof Stamp> = {
  title: "shared/ui/Stamp",
  component: Stamp,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
  args: { size: "md", children: "EST · MMXIV" },
};
export default meta;
type Story = StoryObj<typeof Stamp>;

export const Small: Story = { args: { size: "sm", children: "11 YRS" } };
export const Medium: Story = { args: { size: "md", children: "EST · MMXIV" } };
export const Large: Story = {
  args: { size: "lg", children: "VERIFIED · 2023" },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Stamp size="sm">11 YRS</Stamp>
      <Stamp size="md">EST · MMXIV</Stamp>
      <Stamp size="lg">VERIFIED · 2023</Stamp>
    </div>
  ),
};

export const InlineWithText: Story = {
  render: () => (
    <p className="text-text-2 max-w-md">
      Open eleven years <Stamp size="sm">EST · MMXIV</Stamp> — by appointment
      only, single chair, every set logged.
    </p>
  ),
};
