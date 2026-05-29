import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Plate } from "./plate";

describe("Plate", () => {
  it("renders the number and label without a PLATE prefix", () => {
    render(<Plate number={2} label="THE MENU" />);
    expect(screen.getByText(/02 · THE MENU/)).toBeInTheDocument();
    expect(screen.queryByText(/PLATE/)).not.toBeInTheDocument();
  });

  it("zero-pads single digits and leaves double digits alone", () => {
    const { rerender } = render(<Plate number={1} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    rerender(<Plate number={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("omits the separator and label when label is absent", () => {
    render(<Plate number={3} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("renders a large folio numeral when folio is true", () => {
    const { container } = render(<Plate number={2} label="THE MENU" folio />);
    const display = container.querySelector(".font-display");
    expect(display?.textContent).toContain("02");
    expect(screen.getByText(/THE MENU/)).toBeInTheDocument();
  });

  it("does not render a folio numeral by default", () => {
    const { container } = render(<Plate number={2} label="THE MENU" />);
    expect(container.querySelector(".font-display")).toBeNull();
  });
});
