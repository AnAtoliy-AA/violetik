import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Marquee } from "./marquee";

describe("Marquee", () => {
  it("duplicates its children so the loop seams seamlessly", () => {
    render(
      <Marquee data-testid="m">
        <span>tonight</span>
      </Marquee>,
    );
    // Once visible + once aria-hidden duplicate.
    expect(screen.getAllByText("tonight")).toHaveLength(2);
  });

  it("respects custom className", () => {
    render(
      <Marquee className="custom-x" data-testid="m">
        <span>x</span>
      </Marquee>,
    );
    expect(screen.getByTestId("m")).toHaveClass("custom-x");
  });

  it("applies duration as a CSS variable", () => {
    const { container } = render(
      <Marquee duration="20s">
        <span>x</span>
      </Marquee>,
    );
    const track = container.querySelector("[style*='--marquee-duration']");
    expect(track).not.toBeNull();
  });
});
