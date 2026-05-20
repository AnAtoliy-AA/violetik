import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../api/start", () => ({
  startGoogleOAuth: vi.fn(),
}));

import { ConnectButton } from "./connect-button";

describe("ConnectButton", () => {
  it("renders the supplied label inside a submit button", () => {
    render(<ConnectButton label="Connect Google Calendar" />);
    const btn = screen.getByRole("button", { name: /connect google calendar/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("type", "submit");
  });
});
