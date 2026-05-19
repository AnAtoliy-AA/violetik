import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceMenuItem } from "./service-menu-item";
import { STUDIO_DATA } from "@/entities/studio";
import type { NailTileVariant } from "@/shared/ui/nail-tile";

const meta: Meta<typeof ServiceMenuItem> = {
  title: "entities/service/ServiceMenuItem",
  component: ServiceMenuItem,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Catalog-row layout used on /services. Larger thumbnail than the Home Signatures `ServiceCard`, with a plate-number prefix, italic title + gold price, a `{duration} · {category}` mark, and the blurb below. Hover translates 4px right.",
      },
    },
  },
  args: {
    service: STUDIO_DATA.services[0],
    plateNumber: 1,
    variant: 0,
    topRule: false,
  },
  argTypes: {
    variant: { control: { type: "select" }, options: [0, 1, 2, 3, 4, 5] },
    plateNumber: { control: "number" },
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
type Story = StoryObj<typeof ServiceMenuItem>;

export const Default: Story = { args: { topRule: true } };

export const Stack: Story = {
  render: () => (
    <div className="flex w-[380px] flex-col">
      {STUDIO_DATA.services.map((s, i) => (
        <ServiceMenuItem
          key={s.id}
          service={s}
          plateNumber={i + 1}
          variant={(i % 6) as NailTileVariant}
          topRule={i === 0}
        />
      ))}
    </div>
  ),
};
