import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { SiteFooter } from "./site-footer";

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
