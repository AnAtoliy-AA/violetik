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
});
