import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  revokeVipAction: vi.fn(),
}));

import { VipRevokeButton } from "./vip-revoke-button";

const meta: Meta<typeof VipRevokeButton> = {
  component: VipRevokeButton,
  args: { userId: "tg:demo", label: "Revoke VIP", onSubmit: () => {} },
};
export default meta;
type Story = StoryObj<typeof VipRevokeButton>;
export const Default: Story = {};
