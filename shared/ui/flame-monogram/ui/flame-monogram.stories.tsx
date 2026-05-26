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
          "Rotating monogram letter rendered as fire: the glyph is filled with a vertical fire gradient (white-hot at the base, ember-orange at the tips) displaced by SVG turbulence, while extruded back layers fade from bright orange to black-cherry. A flame body wraps the V via a metaball mask, with 36 free sparks and a three-strand smoke wisp drifting upward. Honors prefers-reduced-motion.",
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
