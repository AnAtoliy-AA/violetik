import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../api/actions", () => ({
  setUserRoleAction: vi.fn(),
  setAdminNoteAction: vi.fn(),
  grantVipAction: vi.fn(),
  revokeVipAction: vi.fn(),
  mergeUsersAction: vi.fn(),
}));

import { VipRevokeButton } from "./vip-revoke-button";

describe("VipRevokeButton", () => {
  it("calls onSubmit when clicked", () => {
    const onSubmit = vi.fn();
    render(
      <VipRevokeButton userId="tg:1" label="Revoke VIP" onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Revoke VIP" }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
