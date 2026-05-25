import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "./stamp";

describe("Stamp", () => {
  it("renders its children", () => {
    render(<Stamp>EST · MMXIV</Stamp>);
    expect(screen.getByText("EST · MMXIV")).toBeInTheDocument();
  });

  it("applies the requested size variant class", () => {
    render(<Stamp size="lg">VERIFIED</Stamp>);
    expect(screen.getByText("VERIFIED")).toHaveClass("h-16");
  });

  it("respects a custom className", () => {
    render(<Stamp className="custom-x">11 YRS</Stamp>);
    expect(screen.getByText("11 YRS")).toHaveClass("custom-x");
  });

  it("tilts via inline transform", () => {
    render(<Stamp>X</Stamp>);
    const el = screen.getByText("X") as HTMLSpanElement;
    expect(el.style.transform).toContain("rotate");
  });
});
