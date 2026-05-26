import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QrTile } from "./qr-tile";

const tinyMatrix: boolean[][] = [
  [true, false, true],
  [false, true, false],
  [true, false, true],
];

describe("QrTile", () => {
  it("renders the matrix as a grid with the right module count", () => {
    const { container } = render(<QrTile matrix={tinyMatrix} caption="X" />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(9);
  });

  it("renders the caption text when provided", () => {
    render(<QrTile matrix={tinyMatrix} caption="BOOK BY MESSAGE" />);
    expect(screen.getByText("BOOK BY MESSAGE")).toBeInTheDocument();
  });

  it("wraps the tile in a link when href is provided", () => {
    render(<QrTile matrix={tinyMatrix} href="https://t.me/x" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://t.me/x");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("declares the grid as an accessible image", () => {
    render(<QrTile matrix={tinyMatrix} />);
    expect(screen.getByRole("img", { name: "QR code" })).toBeInTheDocument();
  });

  it("throws on a non-square matrix", () => {
    expect(() =>
      render(<QrTile matrix={[[true, false], [false]]} />),
    ).toThrow();
  });
});
