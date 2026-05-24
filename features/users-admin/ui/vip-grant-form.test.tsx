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

import { VipGrantForm } from "./vip-grant-form";

describe("VipGrantForm", () => {
  it("submits the chosen ISO date when no-expiry is off", () => {
    const onSubmit = vi.fn();
    render(
      <VipGrantForm
        userId="tg:1"
        defaultExpiry="2026-06-23"
        untilLabel="Expires on"
        noExpiryLabel="No expiry"
        grantLabel="Grant VIP"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Grant VIP" }));
    expect(onSubmit).toHaveBeenCalledWith({ expiresAt: "2026-06-23" });
  });

  it("submits no-expiry when checkbox is on", () => {
    const onSubmit = vi.fn();
    render(
      <VipGrantForm
        userId="tg:1"
        defaultExpiry="2026-06-23"
        untilLabel="Expires on"
        noExpiryLabel="No expiry"
        grantLabel="Grant VIP"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByLabelText("No expiry"));
    fireEvent.click(screen.getByRole("button", { name: "Grant VIP" }));
    expect(onSubmit).toHaveBeenCalledWith({ expiresAt: null });
  });
});
