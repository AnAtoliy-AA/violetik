import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Ornament } from "./ornament";

const meta: Meta<typeof Ornament> = {
  title: "shared/ui/Ornament",
  component: Ornament,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Ornament>;

export const Default: Story = {
  render: () => (
    <div className="w-96 p-6">
      <Ornament />
    </div>
  ),
};
