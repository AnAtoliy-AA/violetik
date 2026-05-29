import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SpotlightCard } from "./spotlight-card";

const meta: Meta<typeof SpotlightCard> = {
  title: "shared/ui/SpotlightCard",
  component: SpotlightCard,
  tags: ["autodocs"],
  parameters: {
    backgrounds: { default: "aubergine" },
  },
};
export default meta;

type Story = StoryObj<typeof SpotlightCard>;

export const Default: Story = {
  render: () => (
    <SpotlightCard className="gilded w-80 p-6 bg-surface">
      <p className="font-display italic text-2xl text-text">Move your pointer</p>
      <p className="text-sm text-text-2 mt-2">
        A radial highlight follows the pointer, painted via a CSS variable
        without re-rendering React.
      </p>
    </SpotlightCard>
  ),
};

export const AsArticle: Story = {
  render: () => (
    <SpotlightCard
      as="article"
      className="gilded-lift w-80 p-6 bg-surface"
    >
      <h3 className="font-display italic text-3xl text-text">Atelier</h3>
      <p className="text-sm text-text-2 mt-2">
        Combines the new <code>.gilded-lift</code> utility with the pointer
        spotlight.
      </p>
    </SpotlightCard>
  ),
};

export const Glass: Story = {
  decorators: [
    (Story) => (
      <div
        className="flex items-center justify-center min-h-[300px] rounded-xl"
        style={{
          background:
            "linear-gradient(135deg, #1a0a2e 0%, #2d1155 50%, #0d1a3a 100%)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <SpotlightCard variant="glass" className="w-80 p-6">
      <p className="font-display italic text-2xl text-text">Liquid Glass</p>
      <p className="text-sm text-text-2 mt-2">
        The outer GlassSurface owns the specular highlight; the inner{" "}
        <code>.spotlight</code> div tracks the pointer gradient — two{" "}
        <code>::after</code> layers coexisting without conflict.
      </p>
    </SpotlightCard>
  ),
};
