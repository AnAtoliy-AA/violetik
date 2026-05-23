import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { StudioMap } from "./studio-map";

const DICT = {
  mapAria: "Studio location",
  mapTitle: "Studio location",
  getDirections: "Get directions",
};

const meta: Meta<typeof StudioMap> = {
  title: "Widgets / Studio Map",
  component: StudioMap,
};
export default meta;
type Story = StoryObj<typeof StudioMap>;

export const Hidden: Story = {
  args: { settings: DEFAULT_SITE_SETTINGS, dictionary: DICT },
};

export const NoCoords: Story = {
  args: {
    settings: { ...DEFAULT_SITE_SETTINGS, mapVisible: true },
    dictionary: DICT,
  },
};

export const Visible: Story = {
  args: {
    settings: {
      ...DEFAULT_SITE_SETTINGS,
      mapVisible: true,
      latitude: 54.231,
      longitude: 28.491,
    },
    dictionary: DICT,
  },
};
