import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "shared/ui/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["solid", "gold", "outline", "ghost"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    block: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { children: "Reserve a chair" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Solid: Story = { args: { variant: "solid" } };
export const Gold: Story = { args: { variant: "gold" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Block: Story = { args: { block: true, variant: "gold" } };
export const WithIcon: Story = {
  args: {
    icon: <span aria-hidden className="size-1.5 rotate-45 bg-current" />,
  },
};
export const Disabled: Story = { args: { disabled: true, variant: "gold" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="solid">Solid</Button>
      <Button variant="gold">Gold</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="gold" size="sm">
        Small
      </Button>
      <Button variant="gold" size="lg">
        Large
      </Button>
      <Button variant="gold" disabled>
        Disabled
      </Button>
      <div className="w-80">
        <Button variant="gold" block>
          Block
        </Button>
      </div>
    </div>
  ),
};
