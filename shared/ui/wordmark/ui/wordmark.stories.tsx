import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmark } from "./wordmark";

const meta: Meta<typeof Wordmark> = {
  title: "shared/ui/Wordmark",
  component: Wordmark,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg"] },
    animated: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Wordmark>;

export const Medium: Story = {};
export const ExtraSmall: Story = { args: { size: "xs" } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const HeaderAnimated: Story = { args: { size: "sm", animated: true } };
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8 items-start">
      <Wordmark size="xs" />
      <Wordmark size="sm" />
      <Wordmark size="md" />
      <Wordmark size="lg" />
    </div>
  ),
};
