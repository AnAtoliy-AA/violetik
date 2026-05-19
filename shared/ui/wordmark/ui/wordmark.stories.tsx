import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmark } from "./wordmark";

const meta: Meta<typeof Wordmark> = {
  title: "shared/ui/Wordmark",
  component: Wordmark,
  tags: ["autodocs"],
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
};
export default meta;
type Story = StoryObj<typeof Wordmark>;

export const Medium: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8 items-start">
      <Wordmark size="sm" />
      <Wordmark size="md" />
      <Wordmark size="lg" />
    </div>
  ),
};
