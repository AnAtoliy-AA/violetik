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

import { RoleToggle } from "./role-toggle";

describe("RoleToggle", () => {
  it("renders both options with the current one selected", () => {
    render(
      <RoleToggle
        userId="tg:1"
        role="customer"
        customerLabel="Customer"
        adminLabel="Admin"
        lastAdminErrorLabel="Cannot demote last admin"
        onSubmit={() => {}}
      />,
    );
    const customer = screen.getByRole("radio", { name: "Customer" });
    expect(customer.getAttribute("aria-checked")).toBe("true");
    const admin = screen.getByRole("radio", { name: "Admin" });
    expect(admin.getAttribute("aria-checked")).toBe("false");
  });

  it("calls onSubmit when toggled to the other option", () => {
    const onSubmit = vi.fn();
    render(
      <RoleToggle
        userId="tg:1"
        role="customer"
        customerLabel="Customer"
        adminLabel="Admin"
        lastAdminErrorLabel="Cannot demote last admin"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Admin" }));
    expect(onSubmit).toHaveBeenCalledWith("admin");
  });

  it("does not call onSubmit when clicking the already-selected option", () => {
    const onSubmit = vi.fn();
    render(
      <RoleToggle
        userId="tg:1"
        role="customer"
        customerLabel="Customer"
        adminLabel="Admin"
        lastAdminErrorLabel="Cannot demote last admin"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Customer" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
