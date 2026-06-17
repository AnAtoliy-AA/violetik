import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingStepper } from "./booking-stepper";

const LABELS = ["Service", "Date", "Time", "Confirm"];

describe("BookingStepper — glass chrome", () => {
  it("renders the chrome as a GlassSurface", () => {
    const { container } = render(
      <BookingStepper labels={LABELS} current={0} />,
    );
    const candidates = container.querySelectorAll("[data-glass='true']");
    const stepperSurface = Array.from(candidates).find((el) =>
      el.className.includes("glass-cool"),
    );
    expect(stepperSurface).not.toBeUndefined();
    expect((stepperSurface as HTMLElement).className).toMatch(/glass-md/);
  });
});

describe("BookingStepper", () => {
  it("renders every label", () => {
    render(<BookingStepper labels={LABELS} current={0} />);
    for (const label of LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks the active label with aria-current=step", () => {
    render(<BookingStepper labels={LABELS} current={2} />);
    const timeEl = screen.getByText("Time");
    // The text is wrapped in an inner <span>; aria-current lives on the outer <span>.
    const outer = timeEl.closest("[aria-current]");
    expect(outer).not.toBeNull();
    expect(outer).toHaveAttribute("aria-current", "step");
    const serviceEl = screen.getByText("Service");
    expect(serviceEl.closest("[aria-current]")).toBeNull();
  });

  it("fills the bars up to and including the current step", () => {
    const { container } = render(<BookingStepper labels={LABELS} current={1} />);
    // Each bar is a parent div with an inner fill div; the parent has aria-hidden.
    const bars = container.querySelectorAll('div[aria-hidden="true"]');
    expect(bars).toHaveLength(4);
    // Bars 0 and 1 (current) should have a full-width inner fill.
    const fill0 = bars[0].querySelector("div");
    const fill1 = bars[1].querySelector("div");
    expect(fill0).not.toBeNull();
    expect(fill1).not.toBeNull();
    expect(fill0!.className).toContain("w-full");
    expect(fill1!.className).toContain("w-full");
    // Bars 2 and 3 (future) should have w-0.
    const fill2 = bars[2].querySelector("div");
    const fill3 = bars[3].querySelector("div");
    expect(fill2!.className).toContain("w-0");
    expect(fill3!.className).toContain("w-0");
  });
});
