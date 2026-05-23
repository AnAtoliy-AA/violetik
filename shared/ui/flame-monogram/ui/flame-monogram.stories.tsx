import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FlameMonogram } from "./flame-monogram";

const meta: Meta<typeof FlameMonogram> = {
  title: "shared/ui/FlameMonogram",
  component: FlameMonogram,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Rotating premium-quality monogram letter wrapped in a flicker of gold-and-amber flames. The glyph uses the Cormorant display face with the brand gold-shimmer animation; the flames live in SVG so they composite beneath the letter without bleeding into siblings. Honors prefers-reduced-motion.",
      },
    },
  },
  args: {
    letter: "V",
    rotationDuration: 24,
  },
  argTypes: {
    letter: { control: "text" },
    rotationDuration: { control: { type: "range", min: 0, max: 60, step: 2 } },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 220,
          height: 280,
          background: "var(--color-bg)",
          padding: 16,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FlameMonogram>;

export const Default: Story = {};

export const SlowRotation: Story = { args: { rotationDuration: 48 } };

export const CustomLetter: Story = { args: { letter: "A" } };
