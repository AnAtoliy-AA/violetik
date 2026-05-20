import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../api/disconnect", () => ({
  disconnectGoogleCalendar: vi.fn(),
}));

import { ConnectionStatus } from "./connection-status";

describe("ConnectionStatus", () => {
  it("renders the connected email, ISO date, and disconnect button", () => {
    render(
      <ConnectionStatus
        email="v@example.com"
        connectedAt={new Date("2026-05-19T00:00:00Z")}
        disconnectLabel="Disconnect"
        connectedLabel="Connected"
      />,
    );
    expect(screen.getByText("v@example.com")).toBeInTheDocument();
    expect(screen.getByText("2026-05-19")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /disconnect/i }),
    ).toBeInTheDocument();
  });
});
