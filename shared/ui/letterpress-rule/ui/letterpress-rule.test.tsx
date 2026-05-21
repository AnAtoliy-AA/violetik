import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LetterpressRule } from "./letterpress-rule";

describe("LetterpressRule", () => {
  it("renders as a presentational decorative element", () => {
    render(<LetterpressRule />);
    expect(
      screen.getByRole("presentation", { hidden: true }),
    ).toBeInTheDocument();
  });

  it("merges incoming className", () => {
    const { container } = render(<LetterpressRule className="my-4" />);
    expect(container.firstChild).toHaveClass("my-4");
  });

  it("renders a thin (1px) horizontal element", () => {
    const { container } = render(<LetterpressRule />);
    expect(container.firstChild).toHaveClass("h-px");
  });
});
