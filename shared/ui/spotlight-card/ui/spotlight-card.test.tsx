import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpotlightCard } from "./spotlight-card";

describe("SpotlightCard", () => {
  it("renders children inside a div by default with .spotlight", () => {
    render(<SpotlightCard>content</SpotlightCard>);
    const node = screen.getByText("content");
    expect(node.tagName).toBe("DIV");
    expect(node).toHaveClass("spotlight");
  });

  it("honors the `as` prop", () => {
    render(<SpotlightCard as="article">content</SpotlightCard>);
    expect(screen.getByText("content").tagName).toBe("ARTICLE");
  });

  it("sets --mx and --my CSS variables on pointer move", () => {
    render(<SpotlightCard>content</SpotlightCard>);
    const node = screen.getByText("content") as HTMLElement;
    // jsdom's getBoundingClientRect returns zeros, so client coords map directly.
    fireEvent.pointerMove(node, { clientX: 42, clientY: 17 });
    expect(node.style.getPropertyValue("--mx")).toBe("42px");
    expect(node.style.getPropertyValue("--my")).toBe("17px");
  });

  it("merges consumer className with the .spotlight base", () => {
    render(<SpotlightCard className="border">content</SpotlightCard>);
    const node = screen.getByText("content");
    expect(node).toHaveClass("spotlight");
    expect(node).toHaveClass("border");
  });

  it("renders glass variant with nested spotlight inside a GlassSurface", () => {
    render(<SpotlightCard variant="glass">body</SpotlightCard>);
    const text = screen.getByText("body");
    const spotlight = text.closest(".spotlight")!;
    const surface = text.closest("[data-glass]")!;
    expect(spotlight).not.toBeNull();
    expect(surface).not.toBeNull();
    // The glass surface is the outer of the two — spotlight is its descendant.
    expect(surface.contains(spotlight)).toBe(true);
    expect(surface.className).toMatch(/glass-warm/);
    expect(surface.className).toMatch(/glass-specular/);
  });

  it("solid variant is unchanged (no GlassSurface wrapper)", () => {
    render(<SpotlightCard variant="solid">body</SpotlightCard>);
    const text = screen.getByText("body");
    expect(text.closest("[data-glass]")).toBeNull();
    expect(text.closest(".spotlight")).not.toBeNull();
  });
});
