import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceCard } from "./service-card";
import { STUDIO_DATA } from "@/entities/studio";

const sample = STUDIO_DATA.services[0];

const meta: Meta<typeof ServiceCard> = {
  title: "entities/service/ServiceCard",
  component: ServiceCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Menu-row layout used on the Home `Signatures` section and the `/services` catalog. Renders a NailTile thumbnail, italic display title, dot-leader to a gold price, the service blurb, and a mono duration tag. Hover translates the row 4px to the right (touch-friendly since hit area is unchanged).",
      },
    },
  },
  args: { service: sample, variant: 0, topRule: false },
  argTypes: {
    variant: { control: { type: "select" }, options: [0, 1, 2, 3, 4, 5] },
    topRule: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 380 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ServiceCard>;

export const Default: Story = {};

export const WithTopRule: Story = { args: { topRule: true } };

export const WithDiscount: Story = {
  args: {
    resolvedPrice: { base: 145, effective: 116, hasDiscount: true },
  },
};

export const Stack: Story = {
  render: () => (
    <div className="flex w-[380px] flex-col">
      {STUDIO_DATA.services.slice(0, 4).map((s, i) => (
        <ServiceCard
          key={s.id}
          service={s}
          variant={(i % 6) as 0 | 1 | 2 | 3 | 4 | 5}
          topRule={i === 0}
        />
      ))}
    </div>
  ),
};
