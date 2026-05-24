import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  grantVipAction: vi.fn(),
}));

import { VipGrantForm } from "./vip-grant-form";

const meta: Meta<typeof VipGrantForm> = {
  component: VipGrantForm,
  args: {
    userId: "tg:demo",
    defaultExpiry: "2026-06-23",
    untilLabel: "Expires on",
    noExpiryLabel: "No expiry",
    grantLabel: "Grant VIP",
    onSubmit: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof VipGrantForm>;
export const Default: Story = {};
