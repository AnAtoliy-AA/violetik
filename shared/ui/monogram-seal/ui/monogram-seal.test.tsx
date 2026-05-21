import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonogramSeal } from "./monogram-seal";

describe("MonogramSeal", () => {
  it("renders as a decorative seal (aria-hidden, presentation)", () => {
    render(<MonogramSeal letter="V" />);
    expect(
      screen.getByRole("presentation", { hidden: true }),
    ).toBeInTheDocument();
  });

  it("renders the provided letter", () => {
    const { container } = render(<MonogramSeal letter="V" />);
    expect(container.textContent).toContain("V");
  });

  it("merges incoming className on the outer ring", () => {
    const { container } = render(
      <MonogramSeal letter="V" className="size-10" />,
    );
    expect(container.firstChild).toHaveClass("size-10");
  });
});
