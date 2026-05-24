import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NailTile } from "./nail-tile";

describe("NailTile", () => {
  it("renders a container with the layered background style", () => {
    const { container } = render(<NailTile />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.style.background).not.toBe("");
    expect(root.style.boxShadow).toContain("inset");
  });

  it("uses the provided palette colors in the background", () => {
    const { container } = render(
      <NailTile palette={["#abcdef", "#123456"]} variant={1} />,
    );
    const root = container.firstChild as HTMLElement;
    // jsdom normalizes hex literals to rgb() before exposing the inline style.
    expect(root.style.background).toContain("rgb(171, 205, 239)");
    expect(root.style.background).toContain("rgb(18, 52, 86)");
  });

  it("renders the vignette and grain overlays as aria-hidden", () => {
    const { container } = render(<NailTile />);
    const overlays = container.querySelectorAll('[aria-hidden="true"]');
    expect(overlays.length).toBe(2);
  });

  it("normalizes out-of-range variant indices via modulo", () => {
    const { container: a } = render(
      <NailTile variant={0} palette={["#aaaaaa", "#bbbbbb"]} />,
    );
    const { container: b } = render(
      // @ts-expect-error: intentionally pushing past the typed range
      <NailTile variant={6} palette={["#aaaaaa", "#bbbbbb"]} />,
    );
    expect((a.firstChild as HTMLElement).style.background).toBe(
      (b.firstChild as HTMLElement).style.background,
    );
  });

  it("merges incoming className and style overrides", () => {
    const { container } = render(
      <NailTile className="rounded-lg" style={{ width: 100, height: 100 }} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("rounded-lg");
    expect(root.style.width).toBe("100px");
    expect(root.style.height).toBe("100px");
  });

  describe("with an image asset", () => {
    it("renders a next/image instead of the gradient when image is set", () => {
      const { container } = render(
        <NailTile
          image={{ src: "/studio/services/signature.jpg", alt: "Signature" }}
        />,
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("alt", "Signature");
    });

    it("falls back to the gradient background when no image is set", () => {
      const { container } = render(<NailTile palette={["#aaa", "#bbb"]} />);
      const img = container.querySelector("img");
      expect(img).toBeNull();
      expect((container.firstChild as HTMLElement).style.background).not.toBe(
        "",
      );
    });

    it("forwards an empty alt string when image.alt is omitted", () => {
      const { container } = render(
        <NailTile image={{ src: "/studio/x.jpg" }} />,
      );
      const img = container.querySelector("img");
      expect(img).toHaveAttribute("alt", "");
    });
  });
});
