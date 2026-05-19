import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LetterReveal } from "./letter-reveal";

describe("LetterReveal", () => {
  it("exposes the full word via aria-label for screen readers", () => {
    render(<LetterReveal text="Violetta" />);
    expect(screen.getByLabelText("Violetta")).toBeInTheDocument();
  });

  it("renders one aria-hidden span per character", () => {
    const { container } = render(<LetterReveal text="abc" />);
    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBe(3);
    expect(hidden[0].textContent).toBe("a");
    expect(hidden[1].textContent).toBe("b");
    expect(hidden[2].textContent).toBe("c");
  });

  it("merges incoming className", () => {
    const { container } = render(
      <LetterReveal text="x" className="text-2xl" />,
    );
    expect(container.firstChild).toHaveClass("text-2xl");
  });
});
