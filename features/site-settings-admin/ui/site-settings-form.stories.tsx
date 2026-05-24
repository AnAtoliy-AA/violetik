import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/entities/site-settings";
import { SiteSettingsForm } from "./site-settings-form";

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
    vipBasePrice: 180,
    onSubmit: noopSubmit,
  },
};

const populated: SiteSettings = {
  ...DEFAULT_SITE_SETTINGS,
  defaultPalette: "ruby",
  defaultLocale: "ru",
  currency: "RUB",
  priceOverrides: { "membership:VIP": 200 },
  discountPercent: 15,
  discountActive: true,
};

export const Populated: Story = {
  args: {
    initial: populated,
    vipBasePrice: 180,
    onSubmit: noopSubmit,
  },
};
