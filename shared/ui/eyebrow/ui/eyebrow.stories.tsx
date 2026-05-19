import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Eyebrow } from "./eyebrow";

const meta: Meta<typeof Eyebrow> = {
  title: "shared/ui/Eyebrow",
  component: Eyebrow,
  tags: ["autodocs"],
  args: { children: "PLATE 02 · THE MENU" },
  argTypes: { gold: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof Eyebrow>;

export const Default: Story = {};
export const Gold: Story = { args: { gold: true } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-start">
      <Eyebrow>VOL · No 12 · ATELIER</Eyebrow>
      <Eyebrow gold>SIGNATURE · GEL</Eyebrow>
    </div>
  ),
};
