import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/master/violetta",
}));

import { SiteFooter } from "./site-footer";
import { NextIntlClientProvider } from "next-intl";

const meta: Meta<typeof SiteFooter> = {
  title: "widgets/SiteFooter",
  component: SiteFooter,
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={{ SiteFooter: { credit_prefix: "Created with Love by" } }}
      >
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
export const Default: StoryObj<typeof SiteFooter> = {};
