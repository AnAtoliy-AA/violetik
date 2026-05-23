import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

import { LocaleSwitcher } from "./locale-switcher";

const messages = { LocaleSwitcher: { label: "Language", en: "English", ru: "Russian", by: "Belarusian" } };

const meta: Meta<typeof LocaleSwitcher> = {
  title: "features/LocaleSwitcher",
  component: LocaleSwitcher,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LocaleSwitcher>;

export const Header: Story = { args: { variant: "header" } };
export const Welcome: Story = { args: { variant: "welcome" } };
