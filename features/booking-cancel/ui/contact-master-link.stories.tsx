import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ContactMasterLink } from "./contact-master-link";

const messages = {
  Profile: {
    contact_master_cta: "Contact {name} on Telegram",
    contact_studio_cta: "Contact the studio on Telegram",
    contact_offline_cta: "Please contact the studio.",
  },
};

const meta = {
  title: "Features/BookingCancel/ContactMasterLink",
  component: ContactMasterLink,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof ContactMasterLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PerMaster: Story = {
  args: {
    masterName: "Violetta",
    masterTelegram: "violetta",
    studioTelegram: "studio",
  },
};
export const StudioFallback: Story = {
  args: {
    masterName: "Violetta",
    masterTelegram: null,
    studioTelegram: "studio",
  },
};
export const Offline: Story = {
  args: {
    masterName: "Violetta",
    masterTelegram: null,
    studioTelegram: null,
  },
};
