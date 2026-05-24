import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ornament } from "./ornament";

describe("Ornament", () => {
  it("renders with presentation role (decorative only)", () => {
    render(<Ornament />);
    expect(
      screen.getByRole("presentation", { hidden: true }),
    ).toBeInTheDocument();
  });

  it("merges incoming className", () => {
    const { container } = render(<Ornament className="my-8" />);
    expect(container.firstChild).toHaveClass("my-8");
  });
});
