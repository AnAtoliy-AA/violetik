import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a rect placeholder by default with the skeleton class", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass("skeleton");
  });

  it("renders multiple lines when variant=line and lines>1", () => {
    render(<Skeleton variant="line" lines={3} data-testid="sk" />);
    const wrapper = screen.getByTestId("sk");
    expect(wrapper.children).toHaveLength(3);
  });

  it("applies size to circle variant", () => {
    render(<Skeleton variant="circle" size={64} data-testid="sk" />);
    const el = screen.getByTestId("sk") as HTMLDivElement;
    expect(el.style.width).toBe("64px");
    expect(el.style.height).toBe("64px");
  });

  it("respects custom className", () => {
    render(<Skeleton className="custom-x" data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass("custom-x");
  });

  it("declares aria-busy for assistive tech", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveAttribute("aria-busy", "true");
  });
});
