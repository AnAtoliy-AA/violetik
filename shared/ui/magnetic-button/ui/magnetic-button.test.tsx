import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MagneticButton } from "./magnetic-button";

describe("MagneticButton", () => {
  it("renders its children", () => {
    render(
      <MagneticButton>
        <button>Reserve</button>
      </MagneticButton>,
    );
    expect(screen.getByRole("button", { name: "Reserve" })).toBeInTheDocument();
  });

  it("marks the wrapper with data-magnetic when motion is enabled", () => {
    // jsdom returns matches: false from matchMedia (see vitest.setup.ts),
    // which is the same shape as a desktop browser without reduced motion.
    render(
      <MagneticButton>
        <button>Reserve</button>
      </MagneticButton>,
    );
    const wrapper = screen.getByRole("button", { name: "Reserve" })
      .parentElement;
    expect(wrapper).toHaveAttribute("data-magnetic", "true");
  });

  it("merges a consumer className with the inline-flex base", () => {
    render(
      <MagneticButton className="border">
        <button>Reserve</button>
      </MagneticButton>,
    );
    const wrapper = screen.getByRole("button", { name: "Reserve" })
      .parentElement;
    expect(wrapper).toHaveClass("border");
  });

  it("accepts custom radius and strength props without crashing", () => {
    render(
      <MagneticButton radius={200} strength={16}>
        <button>Reserve</button>
      </MagneticButton>,
    );
    expect(screen.getByRole("button", { name: "Reserve" })).toBeInTheDocument();
  });
});
