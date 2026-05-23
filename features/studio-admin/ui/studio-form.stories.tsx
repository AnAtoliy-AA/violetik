import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { COUNTRIES } from "@/shared/config/countries";
import messages from "@/messages/en.json";
import { StudioForm } from "./studio-form";

const meta: Meta<typeof StudioForm> = {
  title: "Features / Studio Admin / Studio Form",
  component: StudioForm,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StudioForm>;

const TIMEZONES = ["UTC", "Europe/Minsk", "Europe/Warsaw", "America/New_York"];

export const Empty: Story = {
  args: {
    initial: DEFAULT_SITE_SETTINGS,
    countries: COUNTRIES,
    timeZones: TIMEZONES,
    onSubmit: async () => ({ ok: true }),
  },
};

export const Populated: Story = {
  args: {
    initial: {
      ...DEFAULT_SITE_SETTINGS,
      cityEn: "Borisov",
      cityRu: "Борисов",
      cityBe: "Барысаў",
      latitude: 54.231,
      longitude: 28.491,
      mapVisible: true,
    },
    countries: COUNTRIES,
    timeZones: TIMEZONES,
    onSubmit: async () => ({ ok: true }),
  },
};

export const ErrorState: Story = {
  args: {
    initial: DEFAULT_SITE_SETTINGS,
    countries: COUNTRIES,
    timeZones: TIMEZONES,
    onSubmit: async () => ({ ok: false, error: "Something exploded" }),
  },
};
