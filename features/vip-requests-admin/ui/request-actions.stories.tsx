import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  approveRequest: vi.fn(),
  declineRequest: vi.fn(),
}));

import { RequestActions } from "./request-actions";

const meta: Meta<typeof RequestActions> = {
  title: "features/vip-requests-admin/RequestActions",
  component: RequestActions,
};
export default meta;
type Story = StoryObj<typeof RequestActions>;

export const Default: Story = {
  args: {
    requestId: "vipreq_x",
    defaultExpiry: "2026-06-20",
    approveLabel: "Approve",
    declineLabel: "Decline",
  },
};
