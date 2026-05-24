import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tag } from "./tag";

describe("Tag", () => {
  it("renders children with mono caps styling", () => {
    const { container } = render(<Tag>Editorial</Tag>);
    expect(screen.getByText("Editorial")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("font-mono");
    expect(container.firstChild).toHaveClass("uppercase");
  });

  it("does not apply gold or active styling by default", () => {
    const { container } = render(<Tag>Editorial</Tag>);
    expect(container.firstChild).not.toHaveClass("text-gold");
    expect(container.firstChild).not.toHaveClass("bg-surface-2");
  });

  it("applies gold class when gold prop is set", () => {
    const { container } = render(<Tag gold>Editorial</Tag>);
    expect(container.firstChild).toHaveClass("text-gold");
  });

  it("applies active styling when active prop is set", () => {
    const { container } = render(<Tag active>Editorial</Tag>);
    expect(container.firstChild).toHaveClass("bg-surface-2");
    expect(container.firstChild).toHaveClass("text-text");
  });
});
