import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("../api/actions", () => ({
  submitVipRequest: vi.fn(),
  cancelVipRequest: vi.fn(),
}));

import { VipCardCta } from "./vip-card-cta";

const labels = {
  signIn: "Sign in to apply",
  join: "Join VIP",
  cancel: "Cancel request",
  youreVip: "You're a VIP · expires Jul 01",
};

const meta: Meta<typeof VipCardCta> = {
  title: "features/VipCardCta",
  component: VipCardCta,
  args: { labels },
};
export default meta;
type Story = StoryObj<typeof VipCardCta>;

export const Visitor: Story = { args: { state: { kind: "visitor", locale: "en" } } };
export const Member: Story = { args: { state: { kind: "member" } } };
export const Pending: Story = { args: { state: { kind: "pending" } } };
export const Vip: Story = {
  args: { state: { kind: "vip", expiresAt: new Date("2026-07-01") } },
};
