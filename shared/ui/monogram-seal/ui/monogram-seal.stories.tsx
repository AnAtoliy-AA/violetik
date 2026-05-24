import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonogramSeal } from "./monogram-seal";

const meta: Meta<typeof MonogramSeal> = {
  title: "shared/ui/MonogramSeal",
  component: MonogramSeal,
  tags: ["autodocs"],
  args: { letter: "V" },
  argTypes: { letter: { control: "text" } },
};
export default meta;
type Story = StoryObj<typeof MonogramSeal>;

export const Default: Story = {};
export const Large: Story = { args: { className: "size-12 text-[24px]" } };
