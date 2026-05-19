import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NailFan } from "./nail-fan";

describe("NailFan", () => {
  it("renders the default count of nail tiles", () => {
    const { container } = render(<NailFan />);
    expect(container.firstChild?.childNodes.length).toBe(5);
  });

  it("renders the requested count of tiles", () => {
    const { container } = render(<NailFan count={3} />);
    expect(container.firstChild?.childNodes.length).toBe(3);
  });

  it("clamps non-positive counts to 1", () => {
    const { container } = render(<NailFan count={0} />);
    expect(container.firstChild?.childNodes.length).toBe(1);
  });

  it("applies a stepped height via the lift prop", () => {
    const { container } = render(<NailFan count={3} lift={8} />);
    const tiles = Array.from(container.firstChild?.childNodes ?? []) as HTMLElement[];
    expect(tiles[0].style.height).toContain("16px");
    expect(tiles[1].style.height).toContain("8px");
    expect(tiles[2].style.height).toContain("0px");
  });

  it("merges incoming className and style overrides", () => {
    const { container } = render(
      <NailFan className="rotate-3" style={{ width: 200 }} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("rotate-3");
    expect(root.style.width).toBe("200px");
  });
});
