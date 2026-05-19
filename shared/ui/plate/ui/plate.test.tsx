import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Plate } from "./plate";

describe("Plate", () => {
  it("renders the plate marker with zero-padded number", () => {
    render(<Plate number={2} label="THE MENU" />);
    expect(screen.getByText(/PLATE 02/)).toBeInTheDocument();
    expect(screen.getByText(/THE MENU/)).toBeInTheDocument();
  });

  it("zero-pads single digits and leaves double digits alone", () => {
    const { rerender } = render(<Plate number={1} />);
    expect(screen.getByText(/PLATE 01/)).toBeInTheDocument();
    rerender(<Plate number={12} />);
    expect(screen.getByText(/PLATE 12/)).toBeInTheDocument();
  });

  it("omits the separator and label when label is absent", () => {
    render(<Plate number={3} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});
