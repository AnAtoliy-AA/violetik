import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../api/actions", () => ({
  downgradeVip: vi.fn(),
}));

import { ActiveVipDowngradeButton } from "./active-vip-row";

describe("ActiveVipDowngradeButton", () => {
  it("renders the downgrade button with the provided label", () => {
    render(
      <ActiveVipDowngradeButton requestId="vipreq_x" downgradeLabel="Downgrade" />,
    );
    expect(screen.getByRole("button", { name: /downgrade/i })).toBeInTheDocument();
  });

  it("button is not disabled initially", () => {
    render(
      <ActiveVipDowngradeButton requestId="vipreq_x" downgradeLabel="Downgrade" />,
    );
    expect(screen.getByRole("button", { name: /downgrade/i })).not.toBeDisabled();
  });
});
