import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Eyebrow } from "./eyebrow";

describe("Eyebrow", () => {
  it("renders children inside a mono-styled element", () => {
    const { container } = render(<Eyebrow>Plate 02</Eyebrow>);
    expect(screen.getByText("Plate 02")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("font-mono");
    expect(container.firstChild).toHaveClass("uppercase");
  });

  it("does not apply text-gold by default", () => {
    const { container } = render(<Eyebrow>Plate 02</Eyebrow>);
    expect(container.firstChild).not.toHaveClass("text-gold");
  });

  it("applies text-gold when gold prop is set", () => {
    const { container } = render(<Eyebrow gold>Plate 02</Eyebrow>);
    expect(container.firstChild).toHaveClass("text-gold");
  });

  it("merges incoming className", () => {
    const { container } = render(<Eyebrow className="mb-4">x</Eyebrow>);
    expect(container.firstChild).toHaveClass("mb-4");
    expect(container.firstChild).toHaveClass("font-mono");
  });
});
