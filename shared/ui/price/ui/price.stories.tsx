import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Price } from "./price";

const meta: Meta<typeof Price> = {
  title: "shared/ui/Price",
  component: Price,
  args: { currency: "EUR", locale: "en" },
};
export default meta;
type Story = StoryObj<typeof Price>;

export const NoDiscount: Story = {
  args: { resolved: { base: 145, effective: 145, hasDiscount: false } },
};

export const Discounted: Story = {
  args: { resolved: { base: 145, effective: 116, hasDiscount: true } },
};

export const Free: Story = {
  args: {
    resolved: { base: 0, effective: 0, hasDiscount: false },
    freeLabel: "Free",
  },
};

export const RubleRu: Story = {
  args: {
    resolved: { base: 95, effective: 95, hasDiscount: false },
    currency: "RUB",
    locale: "ru",
  },
};

export const ByrBe: Story = {
  args: {
    resolved: { base: 95, effective: 95, hasDiscount: false },
    currency: "BYN",
    locale: "by",
  },
};
