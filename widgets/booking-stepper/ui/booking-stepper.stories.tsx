import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookingStepper } from "./booking-stepper";

const LABELS = ["Service", "Date", "Time", "Confirm"];

const meta: Meta<typeof BookingStepper> = {
  title: "widgets/BookingStepper",
  component: BookingStepper,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Four-bar progress indicator + step labels for the booking flow. Bars to the left of `current` fill gold; the active label is gold too. The fill bar transitions on color via the duration token.",
      },
    },
  },
  args: { labels: LABELS, current: 1 },
  argTypes: {
    current: { control: { type: "range", min: 0, max: 3, step: 1 } },
    labels: { control: "object" },
  },
};
export default meta;
type Story = StoryObj<typeof BookingStepper>;

export const Default: Story = {};
export const Start: Story = { args: { current: 0 } };
export const Halfway: Story = { args: { current: 2 } };
export const Final: Story = { args: { current: 3 } };
