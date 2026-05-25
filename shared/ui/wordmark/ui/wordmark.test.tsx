import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("renders the brand name and subline", () => {
    render(<Wordmark />);
    expect(screen.getByText("Violetta")).toBeInTheDocument();
    expect(screen.getByText("B·E·A·U·T·Y")).toBeInTheDocument();
  });

  it("applies size sm utility classes when size='sm'", () => {
    const { container } = render(<Wordmark size="sm" />);
    expect(container.firstChild).toHaveClass("text-3xl");
  });

  it("applies size lg utility classes when size='lg'", () => {
    const { container } = render(<Wordmark size="lg" />);
    expect(container.firstChild).toHaveClass("text-7xl");
  });

  it("merges incoming className without dropping internal ones", () => {
    const { container } = render(<Wordmark className="opacity-50" />);
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(container.firstChild).toHaveClass("font-display");
  });

  it("applies the continuous shimmer to both name and subline when animated", () => {
    render(<Wordmark animated />);
    expect(screen.getByText("Violetta")).toHaveClass("text-gold-shimmer");
    expect(screen.getByText("B·E·A·U·T·Y")).toHaveClass("text-gold-shimmer");
  });

  it("keeps the static gold subline when not animated", () => {
    render(<Wordmark />);
    expect(screen.getByText("Violetta")).not.toHaveClass("text-gold-shimmer");
    expect(screen.getByText("B·E·A·U·T·Y")).toHaveClass("text-gold");
    expect(screen.getByText("B·E·A·U·T·Y")).not.toHaveClass("text-gold-shimmer");
  });
});
