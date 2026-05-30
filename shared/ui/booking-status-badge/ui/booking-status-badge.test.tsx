import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BookingStatusBadge } from "./booking-status-badge";

describe("BookingStatusBadge", () => {
  it("renders the provided label text", () => {
    render(<BookingStatusBadge status="pending" label="Pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders an uppercase mono pill", () => {
    render(<BookingStatusBadge status="confirmed" label="Confirmed" />);
    expect(screen.getByText("Confirmed")).toHaveClass("uppercase");
  });

  it("tags each status via data-status", () => {
    const statuses = ["pending", "confirmed", "cancelled", "completed"] as const;
    const seen = new Set<string>();
    for (const s of statuses) {
      const { container, unmount } = render(
        <BookingStatusBadge status={s} label={s} />,
      );
      const attr = container.firstElementChild?.getAttribute("data-status");
      expect(attr).toBe(s);
      seen.add(attr!);
      unmount();
    }
    expect(seen.size).toBe(4);
  });

  it("respects a passed className", () => {
    const { container } = render(
      <BookingStatusBadge status="pending" label="Pending" className="mt-2" />,
    );
    expect(container.firstElementChild).toHaveClass("mt-2");
  });
});
