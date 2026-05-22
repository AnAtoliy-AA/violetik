import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SpecialtyPicker } from "./specialty-picker";

const meta: Meta<typeof SpecialtyPicker> = {
  title: "Features/MastersAdmin/SpecialtyPicker",
  component: SpecialtyPicker,
};
export default meta;

const services = [
  {
    id: "signature",
    name: "Signature",
    categoryId: "care",
    categoryName: "Care",
  },
  {
    id: "pedi",
    name: "Pedicure",
    categoryId: "care",
    categoryName: "Care",
  },
  { id: "gel", name: "Gel", categoryId: "gel", categoryName: "Gel" },
];

export const Default: StoryObj<typeof SpecialtyPicker> = {
  args: { services, value: ["gel"], onChange: () => undefined },
};
