import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  downgradeVip: vi.fn(),
}));

import { ActiveVipDowngradeButton } from "./active-vip-row";

const meta: Meta<typeof ActiveVipDowngradeButton> = {
  title: "features/vip-requests-admin/ActiveVipDowngradeButton",
  component: ActiveVipDowngradeButton,
};
export default meta;
type Story = StoryObj<typeof ActiveVipDowngradeButton>;

export const Default: Story = {
  args: {
    requestId: "vipreq_x",
    downgradeLabel: "Downgrade",
  },
};
