import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LetterpressRule } from "./letterpress-rule";

const meta: Meta<typeof LetterpressRule> = {
  title: "shared/ui/LetterpressRule",
  component: LetterpressRule,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof LetterpressRule>;

export const Default: Story = {
  render: () => (
    <div className="w-96 bg-bg p-6">
      <div className="font-display text-3xl italic text-text">Signatures.</div>
      <LetterpressRule className="mt-3" />
    </div>
  ),
};
