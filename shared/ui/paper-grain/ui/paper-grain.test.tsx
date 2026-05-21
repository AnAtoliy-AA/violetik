import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PaperGrain } from "./paper-grain";

describe("PaperGrain", () => {
  it("renders as a decorative overlay (aria-hidden, presentation)", () => {
    const { container } = render(<PaperGrain />);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.getAttribute("role")).toBe("presentation");
  });

  it("is non-interactive (pointer-events: none)", () => {
    const { container } = render(<PaperGrain />);
    expect(container.firstChild).toHaveClass("pointer-events-none");
  });

  it("merges an incoming className", () => {
    const { container } = render(<PaperGrain className="opacity-50" />);
    expect(container.firstChild).toHaveClass("opacity-50");
  });
});
