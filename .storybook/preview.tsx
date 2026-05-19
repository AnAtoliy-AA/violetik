import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../messages/en.json";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
