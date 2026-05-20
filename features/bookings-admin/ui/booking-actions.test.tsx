import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../api/actions", () => ({
  confirmBooking: vi.fn(),
  declineBooking: vi.fn(),
}));

import { BookingActions } from "./booking-actions";

describe("BookingActions", () => {
  it("renders confirm and decline buttons", () => {
    render(
      <BookingActions
        bookingId="bk_1"
        confirmLabel="Confirm"
        declineLabel="Decline"
      />,
    );
    expect(
      screen.getByRole("button", { name: /confirm/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decline/i }),
    ).toBeInTheDocument();
  });
});
