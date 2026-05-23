import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CancelBookingButton } from "./cancel-booking-button";
import { NextIntlClientProvider } from "next-intl";

const messages = {
  Profile: {
    cancel_button: "Cancel visit",
    cancel_confirming: "Cancelling…",
    cancel_error: "Could not cancel — try again or contact the master.",
  },
};

const meta = {
  title: "Features/BookingCancel/CancelBookingButton",
  component: CancelBookingButton,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof CancelBookingButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    bookingId: "bk_demo",
    action: async () => ({ ok: true }),
  },
};

export const ErrorTooLate: Story = {
  args: {
    bookingId: "bk_demo",
    action: async () => ({ ok: false, reason: "too_late" }),
  },
};

export const Confirming: Story = {
  args: {
    bookingId: "bk_demo",
    // Never resolves — captures the pending visual (disabled + "Cancelling…" label).
    action: () => new Promise(() => {}),
  },
};
