import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NailFan } from "./nail-fan";

const meta: Meta<typeof NailFan> = {
  title: "shared/ui/NailFan",
  component: NailFan,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Vertical fan of NailTiles — the signature hero motif. Tiles step down by `lift` px to create a swatch-tray silhouette. Default palette is Aubergine gold→plum.",
      },
    },
  },
  args: {
    palette: ["#c9a96e", "#7d3a6f"],
    count: 5,
    lift: 6,
    style: { width: 220, height: 160 },
  },
  argTypes: {
    palette: { control: "object" },
    count: { control: { type: "range", min: 1, max: 9, step: 1 } },
    lift: { control: { type: "range", min: 0, max: 24, step: 2 } },
  },
};
export default meta;
type Story = StoryObj<typeof NailFan>;

export const Default: Story = {};

export const Compact: Story = { args: { count: 3, lift: 4 } };

export const Tall: Story = {
  args: { count: 7, lift: 10, style: { width: 320, height: 220 } },
};

export const RosePalette: Story = { args: { palette: ["#e8b08c", "#a8456d"] } };

export const LilacPalette: Story = { args: { palette: ["#e0c4f3", "#8a6cc4"] } };
