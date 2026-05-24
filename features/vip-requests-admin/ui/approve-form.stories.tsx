import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  approveRequest: vi.fn(),
}));

import { ApproveForm } from "./approve-form";

const meta: Meta<typeof ApproveForm> = {
  title: "features/vip-requests-admin/ApproveForm",
  component: ApproveForm,
};
export default meta;
type Story = StoryObj<typeof ApproveForm>;

export const Default: Story = {
  args: {
    requestId: "vipreq_x",
    defaultExpiry: "2026-06-20",
    approveLabel: "Approve",
  },
};
