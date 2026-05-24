import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plate } from "./plate";

const meta: Meta<typeof Plate> = {
  title: "shared/ui/Plate",
  component: Plate,
  tags: ["autodocs"],
  args: { number: 2, label: "THE MENU" },
  argTypes: { number: { control: "number" }, label: { control: "text" } },
};
export default meta;
type Story = StoryObj<typeof Plate>;

export const Default: Story = {};
export const NumberOnly: Story = { args: { label: undefined } };
export const Folio: Story = {
  args: { folio: true, number: 2, label: "THE MENU" },
};
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 items-start">
      <Plate number={1} label="WELCOME" />
      <Plate number={2} label="THE MENU" />
      <Plate number={12} />
    </div>
  ),
};
