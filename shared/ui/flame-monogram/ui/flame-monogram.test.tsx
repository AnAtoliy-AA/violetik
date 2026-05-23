import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlameMonogram } from "./flame-monogram";

describe("FlameMonogram", () => {
  it("renders the default V glyph across extrusion layers", () => {
    render(<FlameMonogram />);
    expect(screen.getByTestId("flame-monogram")).toBeInTheDocument();
    expect(screen.getAllByText("V").length).toBeGreaterThan(0);
  });

  it("renders a custom letter across extrusion layers when provided", () => {
    render(<FlameMonogram letter="A" />);
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });

  it("is marked as decorative for assistive tech", () => {
    render(<FlameMonogram />);
    const root = screen.getByTestId("flame-monogram");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveAttribute("role", "presentation");
  });

  it("merges incoming className with the base classes", () => {
    render(<FlameMonogram className="rotate-3" />);
    const root = screen.getByTestId("flame-monogram");
    expect(root).toHaveClass("rotate-3");
    expect(root).toHaveClass("relative");
  });

  it("renders the requested number of metaball embers", () => {
    const { container } = render(<FlameMonogram emberCount={12} />);
    // Embers live inside the goo mask; free sparks are siblings of the rect.
    expect(container.querySelectorAll("mask circle")).toHaveLength(12);
  });
});
