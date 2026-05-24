import { vi } from "vitest";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  setUserRoleAction: vi.fn(),
}));

import { RoleToggle } from "./role-toggle";

const meta: Meta<typeof RoleToggle> = {
  component: RoleToggle,
  args: {
    userId: "tg:demo",
    customerLabel: "Customer",
    adminLabel: "Admin",
    lastAdminErrorLabel: "Cannot demote last admin",
    onSubmit: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof RoleToggle>;
export const Customer: Story = { args: { role: "customer" } };
export const Admin: Story = { args: { role: "admin" } };
