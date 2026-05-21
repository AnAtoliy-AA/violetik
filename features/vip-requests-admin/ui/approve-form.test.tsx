import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../api/actions", () => ({
  approveRequest: vi.fn(),
}));

import { ApproveForm } from "./approve-form";

describe("ApproveForm", () => {
  it("renders the approve button with the provided label", () => {
    render(
      <ApproveForm
        requestId="vipreq_x"
        defaultExpiry="2026-06-20"
        approveLabel="Approve"
      />,
    );
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });

  it("renders a date input prefilled with defaultExpiry", () => {
    render(
      <ApproveForm
        requestId="vipreq_x"
        defaultExpiry="2026-06-20"
        approveLabel="Approve"
      />,
    );
    const input = screen.getByDisplayValue("2026-06-20");
    expect(input).toHaveAttribute("type", "date");
  });

  it("approve button is not disabled initially", () => {
    render(
      <ApproveForm
        requestId="vipreq_x"
        defaultExpiry="2026-06-20"
        approveLabel="Approve"
      />,
    );
    expect(screen.getByRole("button", { name: /approve/i })).not.toBeDisabled();
  });
});
