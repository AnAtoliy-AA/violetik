import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { GlassSurface } from "./glass-surface";

describe("GlassSurface", () => {
  it("renders as a div by default with data-glass attribute", () => {
    render(<GlassSurface>hello</GlassSurface>);
    const root = screen.getByText("hello").closest("[data-glass]")!;
    expect(root.tagName).toBe("DIV");
    expect(root.getAttribute("data-glass")).toBe("true");
  });

  it("composes tint and blur classes from props", () => {
    render(
      <GlassSurface tint="warm" blur="xl">
        <span>body</span>
      </GlassSurface>,
    );
    const root = screen.getByText("body").closest("[data-glass]")!;
    expect(root.className).toMatch(/glass-warm/);
    expect(root.className).toMatch(/glass-xl/);
  });

  it("applies rim and specular classes when enabled", () => {
    render(
      <GlassSurface rim specular>
        <span>body</span>
      </GlassSurface>,
    );
    const root = screen.getByText("body").closest("[data-glass]")!;
    expect(root.className).toMatch(/glass-rim/);
    expect(root.className).toMatch(/glass-specular/);
  });

  it("applies glass-press class when press is true", () => {
    render(
      <GlassSurface as="button" press>
        <span>tap</span>
      </GlassSurface>,
    );
    const root = screen.getByRole("button");
    expect(root.className).toMatch(/glass-press/);
  });

  it("renders as the polymorphic `as` element", () => {
    render(
      <GlassSurface as="section">
        <span>body</span>
      </GlassSurface>,
    );
    const root = screen.getByText("body").closest("[data-glass]")!;
    expect(root.tagName).toBe("SECTION");
  });

  it("renders as a button with type='button' default", () => {
    render(
      <GlassSurface as="button">
        <span>tap</span>
      </GlassSurface>,
    );
    const root = screen.getByRole("button");
    expect(root.getAttribute("type")).toBe("button");
  });

  it("forwards className after variant classes", () => {
    render(
      <GlassSurface className="custom-class">
        <span>body</span>
      </GlassSurface>,
    );
    const root = screen.getByText("body").closest("[data-glass]")!;
    expect(root.className).toMatch(/custom-class/);
  });

  it("forwards ref on the static (non-interactive) branch", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <GlassSurface ref={ref}>
        <span>body</span>
      </GlassSurface>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.getAttribute("data-glass")).toBe("true");
  });

  it("forwards ref on the interactive (press) branch", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <GlassSurface as="button" press ref={ref}>
        <span>tap</span>
      </GlassSurface>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
  });
});
