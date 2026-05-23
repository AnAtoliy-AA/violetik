import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { LocalBusinessJsonLd } from "./local-business-jsonld";

const meta: Meta<typeof LocalBusinessJsonLd> = {
  title: "Shared / Local Business JSON-LD",
  component: LocalBusinessJsonLd,
};
export default meta;
type Story = StoryObj<typeof LocalBusinessJsonLd>;

const BASE = {
  name: "Violetta Beauty",
  siteUrl: "https://violetta.example.com",
  locale: "en" as const,
};

export const SeededDefault: Story = {
  args: { settings: DEFAULT_SITE_SETTINGS, ...BASE },
};

export const WithCoords: Story = {
  args: {
    settings: {
      ...DEFAULT_SITE_SETTINGS,
      cityEn: "Borisov",
      latitude: 54.231,
      longitude: 28.491,
    },
    ...BASE,
  },
};
