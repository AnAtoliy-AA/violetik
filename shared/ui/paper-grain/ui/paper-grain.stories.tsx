import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PaperGrain } from "./paper-grain";

const meta: Meta<typeof PaperGrain> = {
  title: "shared/ui/PaperGrain",
  component: PaperGrain,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof PaperGrain>;

export const Default: Story = {
  render: () => (
    <div className="relative h-72 w-96 overflow-hidden rounded-lg bg-bg">
      <PaperGrain />
      <div className="relative z-10 p-6 font-display text-2xl italic text-text">
        Atelier paper stock.
      </div>
    </div>
  ),
};

export const HighOpacity: Story = {
  render: () => (
    <div className="relative h-72 w-96 overflow-hidden rounded-lg bg-bg">
      <PaperGrain className="opacity-30" />
    </div>
  ),
};
