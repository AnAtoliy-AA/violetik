import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/entities/site-settings";
import { SiteSettingsForm } from "./site-settings-form";

const services = [
  { id: "signature", name: "Signature Manicure", basePrice: 95 },
  { id: "gel", name: "Couture Gel", basePrice: 145 },
  { id: "editorial", name: "Editorial Art", basePrice: 195 },
];

const meta: Meta<typeof SiteSettingsForm> = {
  title: "features/site-settings-admin/SiteSettingsForm",
  component: SiteSettingsForm,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={en}>
        <div style={{ width: 420 }}>
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SiteSettingsForm>;

const noopSubmit = async () => ({ ok: true as const });

export const Empty: Story = {
  args: {
    initial: DEFAULT_SITE_SETTINGS,
    services,
    vipBasePrice: 180,
    onSubmit: noopSubmit,
  },
};

const populated: SiteSettings = {
  ...DEFAULT_SITE_SETTINGS,
  defaultPalette: "ruby",
  defaultLocale: "ru",
  priceOverrides: { "service:gel": 160, "membership:VIP": 200 },
  discountPercent: 15,
  discountActive: true,
};

export const Populated: Story = {
  args: {
    initial: populated,
    services,
    vipBasePrice: 180,
    onSubmit: noopSubmit,
  },
};
