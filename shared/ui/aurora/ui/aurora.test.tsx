import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Aurora } from "./aurora";

describe("Aurora", () => {
  it("renders an aria-hidden decorative layer", () => {
    render(<Aurora />);
    const node = screen.getByTestId("aurora");
    expect(node).toHaveAttribute("aria-hidden", "true");
    expect(node).toHaveAttribute("role", "presentation");
  });

  it("defaults to subtle intensity (opacity 0.55)", () => {
    render(<Aurora />);
    const node = screen.getByTestId("aurora");
    expect(node).toHaveAttribute("data-intensity", "subtle");
    expect(node.style.opacity).toBe("0.55");
  });

  it("bumps opacity to 0.85 when intensity is vivid", () => {
    render(<Aurora intensity="vivid" />);
    const node = screen.getByTestId("aurora");
    expect(node).toHaveAttribute("data-intensity", "vivid");
    expect(node.style.opacity).toBe("0.85");
  });

  it("renders three palette-tinted blobs", () => {
    render(<Aurora />);
    const node = screen.getByTestId("aurora");
    expect(node.children).toHaveLength(3);
  });

  it("merges a consumer className without dropping the base layer classes", () => {
    render(<Aurora className="rounded-3xl" />);
    const node = screen.getByTestId("aurora");
    expect(node).toHaveClass("rounded-3xl");
    expect(node).toHaveClass("pointer-events-none");
    expect(node).toHaveClass("-z-10");
  });
});
