import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../api/actions", () => ({
  approveRequest: vi.fn(),
  declineRequest: vi.fn(),
}));

import { RequestActions } from "./request-actions";

describe("RequestActions", () => {
  it("renders the approve and decline buttons", () => {
    render(
      <RequestActions
        requestId="vipreq_x"
        defaultExpiry="2026-06-20"
        approveLabel="Approve"
        declineLabel="Decline"
      />,
    );
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
  });

  it("decline button is not disabled initially", () => {
    render(
      <RequestActions
        requestId="vipreq_x"
        defaultExpiry="2026-06-20"
        approveLabel="Approve"
        declineLabel="Decline"
      />,
    );
    expect(screen.getByRole("button", { name: /decline/i })).not.toBeDisabled();
  });
});
