import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ExpiredRowMeta } from "./expired-row";

const meta: Meta<typeof ExpiredRowMeta> = {
  title: "features/vip-requests-admin/ExpiredRowMeta",
  component: ExpiredRowMeta,
};
export default meta;
type Story = StoryObj<typeof ExpiredRowMeta>;

export const Default: Story = {
  args: {
    expiredAt: new Date("2026-01-01T00:00:00Z"),
    expiredAtLabel: "Expired Jan 01",
  },
};
