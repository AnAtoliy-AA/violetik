import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Counter } from "./counter";

describe("Counter", () => {
  it("exposes the live number to screen readers via sr-only text", () => {
    render(<Counter value={612} />);
    expect(screen.getByTestId("counter-value").textContent).toBe("612");
  });

  it("respects minDigits by padding the digit strip", () => {
    const { container } = render(<Counter value={4} minDigits={3} />);
    const ariaHiddenStrip = container.querySelector("[aria-hidden='true']");
    expect(ariaHiddenStrip).not.toBeNull();
    expect(ariaHiddenStrip?.querySelectorAll(".inline-block")).toHaveLength(3);
  });

  it("renders a suffix when provided", () => {
    render(<Counter value={600} suffix="+" />);
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("clamps negative values to zero", () => {
    render(<Counter value={-12} />);
    expect(screen.getByTestId("counter-value").textContent).toBe("0");
  });
});
