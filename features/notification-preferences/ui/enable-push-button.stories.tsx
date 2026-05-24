import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  savePushSubscriptionAction: vi.fn(),
  removePushSubscriptionAction: vi.fn(),
}));

import { EnablePushButton } from "./enable-push-button";

const meta: Meta<typeof EnablePushButton> = {
  component: EnablePushButton,
  args: { vapidPublicKey: "BPLACEHOLDER" },
};
export default meta;
type Story = StoryObj<typeof EnablePushButton>;

export const Default: Story = {};
