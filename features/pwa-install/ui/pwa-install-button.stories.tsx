import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { PwaInstallButton } from "./pwa-install-button";

const messages = {
  PwaInstall: {
    aria_label: "Install app",
    ios_instructions:
      "On iPhone or iPad, tap the Share button and choose 'Add to Home Screen'.",
    ios_close: "Close",
  },
};

const meta: Meta<typeof PwaInstallButton> = {
  title: "features/PwaInstallButton",
  component: PwaInstallButton,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <div className="p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PwaInstallButton>;

/** No `beforeinstallprompt` event captured — button stays hidden. */
export const NotInstallable: Story = {};

/**
 * Simulates a Chromium-style install opportunity by dispatching a
 * synthetic `beforeinstallprompt` event after mount. Decorator effects
 * run after the component's own effects, so the listener is registered
 * before the event fires.
 */
export const Installable: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const evt = new Event("beforeinstallprompt") as Event & {
          prompt: () => Promise<void>;
          userChoice: Promise<{
            outcome: "accepted" | "dismissed";
            platform: string;
          }>;
        };
        evt.prompt = async () => {};
        evt.userChoice = Promise.resolve({
          outcome: "dismissed" as const,
          platform: "web",
        });
        window.dispatchEvent(evt);
      }, []);
      return <Story />;
    },
  ],
};
