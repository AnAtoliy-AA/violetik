import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MasterPicker } from "./master-picker";

const meta: Meta<typeof MasterPicker> = {
  title: "Features/ServicesAdmin/MasterPicker",
  component: MasterPicker,
};
export default meta;

const masters = [
  { id: "violetik", name: "Violetik" },
  { id: "anna-k", name: "Anna K" },
  { id: "marina", name: "Marina" },
];

export const Default: StoryObj<typeof MasterPicker> = {
  args: { masters, value: ["violetik"], onChange: () => undefined },
};

export const Empty: StoryObj<typeof MasterPicker> = {
  args: { masters: [], value: [], onChange: () => undefined },
};
