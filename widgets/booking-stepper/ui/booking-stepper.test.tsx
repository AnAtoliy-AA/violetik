import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingStepper } from "./booking-stepper";

const LABELS = ["Service", "Date", "Time", "Confirm"];

describe("BookingStepper", () => {
  it("renders every label", () => {
    render(<BookingStepper labels={LABELS} current={0} />);
    for (const label of LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks the active label with aria-current=step", () => {
    render(<BookingStepper labels={LABELS} current={2} />);
    expect(screen.getByText("Time")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Service")).not.toHaveAttribute("aria-current");
  });

  it("fills the bars up to and including the current step", () => {
    const { container } = render(<BookingStepper labels={LABELS} current={1} />);
    const bars = container.querySelectorAll('div[aria-hidden="true"]');
    expect(bars).toHaveLength(4);
    expect(bars[0]).toHaveClass("bg-accent");
    expect(bars[1]).toHaveClass("bg-accent");
    expect(bars[2]).toHaveClass("bg-line-strong");
    expect(bars[3]).toHaveClass("bg-line-strong");
  });
});
