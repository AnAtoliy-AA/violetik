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

  it("defines a separate displacement filter for the front-face glyph", () => {
    const { container } = render(<FlameMonogram />);
    const displace = container.querySelector("filter#fm-displace");
    expect(displace).not.toBeNull();
    expect(displace?.querySelector("feTurbulence")).not.toBeNull();
    expect(displace?.querySelector("feDisplacementMap")).not.toBeNull();
  });

  it("renders the front-face glyph with a fire-gradient text and the displace filter", () => {
    const { container } = render(<FlameMonogram />);
    // Front face is the last span (highest z) inside the .grid wrapper.
    const spans = container.querySelectorAll<HTMLElement>("div.grid > span");
    const front = spans[spans.length - 1];
    expect(front).toBeDefined();
    // Inline style replaces the text-gold-shimmer class.
    expect(front.style.color).toBe("transparent");
    expect(front.style.backgroundImage).toContain("linear-gradient");
    expect(front.style.filter).toContain("url(#fm-displace)");
    expect(front.className).not.toMatch(/text-gold-shimmer/);
  });

  it("shades extrusion back layers with ember tones, not bronze", () => {
    const { container } = render(<FlameMonogram />);
    const spans = container.querySelectorAll<HTMLElement>("div.grid > span");
    // Back layer (i=0): color should be near-black-cherry, not bronze.
    // Bronze was rgb(58, 42, 18); ember target is rgb(40, 8, 0).
    const back = spans[0];
    expect(back.style.color).toBe("rgb(40, 8, 0)");
  });
});
