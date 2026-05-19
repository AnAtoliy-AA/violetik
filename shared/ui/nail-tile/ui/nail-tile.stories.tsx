import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NailTile, type NailTileVariant } from "./nail-tile";

const meta: Meta<typeof NailTile> = {
  title: "shared/ui/NailTile",
  component: NailTile,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Editorial-still-life placeholder for product photography. Six variants compose layered gradients + soft vignette + film grain. Swap for `next/image` when real photography lands; keep the prop shape.",
      },
    },
    backgrounds: { default: "atelier" },
  },
  args: {
    palette: ["#c9a96e", "#7d3a6f"],
    variant: 0,
    style: { width: 180, height: 240, borderRadius: 18 },
  },
  argTypes: {
    palette: { control: "object" },
    variant: { control: { type: "select" }, options: [0, 1, 2, 3, 4, 5] },
  },
};
export default meta;
type Story = StoryObj<typeof NailTile>;

export const DomedJewel: Story = {};
export const SatinDrape: Story = { args: { variant: 1 } };
export const AtelierStill: Story = { args: { variant: 2 } };
export const MarbleSwirl: Story = { args: { variant: 3 } };
export const ChromeBevel: Story = { args: { variant: 4 } };
export const InkWash: Story = { args: { variant: 5 } };

export const AllVariants: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <NailTile
          key={v}
          palette={args.palette}
          variant={v as NailTileVariant}
          style={{ width: 140, height: 200, borderRadius: 18 }}
        />
      ))}
    </div>
  ),
};

export const RosePalette: Story = {
  args: { palette: ["#e8b08c", "#a8456d"] },
};

export const LilacPalette: Story = {
  args: { palette: ["#e0c4f3", "#8a6cc4"] },
};
