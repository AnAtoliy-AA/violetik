import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceMenuItem } from "./service-menu-item";
import type { Service } from "../model/types";
import type { NailTileVariant } from "@/shared/ui/nail-tile";

const sample: Service = {
  id: "signature",
  category: { id: "care", name: "Care" },
  name: "Signature Manicure",
  blurb:
    "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
  includes: [],
  price: 95,
  priceCents: 9500,
  displayPrice: "€95",
  duration: "75 min",
  durationMinutes: 75,
  sortOrder: 1,
};

const stackSamples: Service[] = [
  sample,
  {
    id: "gel",
    category: { id: "gel", name: "Gel" },
    name: "Couture Gel",
    blurb:
      "Long-wear Japanese gel in a single tone or a curated nude palette.",
    includes: [],
    price: 145,
    priceCents: 14500,
    displayPrice: "€145",
    duration: "120 min",
    durationMinutes: 120,
    sortOrder: 2,
  },
  {
    id: "editorial",
    category: { id: "design", name: "Design" },
    name: "Editorial Art",
    blurb: "Bespoke nail design — chrome, lace, hand-painted miniatures.",
    includes: [],
    price: 195,
    priceCents: 19500,
    displayPrice: "€195",
    duration: "150 min",
    durationMinutes: 150,
    sortOrder: 3,
  },
  {
    id: "extensions",
    category: { id: "form", name: "Form" },
    name: "Glass Extensions",
    blurb:
      "Sculpted soft-gel extensions in glass, almond or ballerina silhouettes.",
    includes: [],
    price: 240,
    priceCents: 24000,
    displayPrice: "€240",
    duration: "180 min",
    durationMinutes: 180,
    sortOrder: 4,
  },
];

const meta: Meta<typeof ServiceMenuItem> = {
  title: "entities/service/ServiceMenuItem",
  component: ServiceMenuItem,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Catalog-row layout used on /services. Gilded nail-tile thumbnail, gold display-serif folio plate number, hanging letterpress rule, italic title, and a gilded foil-stamp price pill. Hover translates 4px right (no-op with reduced motion).",
      },
    },
  },
  args: {
    service: sample,
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

export const WithDiscount: Story = {
  args: {
    topRule: true,
    resolvedPrice: { base: 145, effective: 116, hasDiscount: true },
  },
};

export const Stack: Story = {
  render: () => (
    <div className="flex w-[380px] flex-col">
      {stackSamples.map((s, i) => (
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
