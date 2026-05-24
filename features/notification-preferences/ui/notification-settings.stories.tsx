import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  savePushSubscriptionAction: vi.fn(),
  removePushSubscriptionAction: vi.fn(),
  toggleCategoryAction: vi.fn(),
}));

import { NotificationSettings } from "./notification-settings";

const meta: Meta<typeof NotificationSettings> = {
  component: NotificationSettings,
  args: {
    vapidPublicKey: "PLACEHOLDER",
    initialPreferences: {},
  },
};
export default meta;
type Story = StoryObj<typeof NotificationSettings>;

export const CustomerDefault: Story = { args: { isAdmin: false } };
export const AdminDefault: Story = { args: { isAdmin: true } };
export const AdminMixedOn: Story = {
  args: {
    isAdmin: true,
    initialPreferences: {
      booking_created: true,
      booking_reminder_24h: true,
      vip_decision: true,
    },
  },
};
