import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PressableSurface } from "./pressable-surface";

describe("PressableSurface", () => {
  it("renders children", () => {
    render(<PressableSurface>Tap me</PressableSurface>);
    expect(screen.getByRole("button", { name: "Tap me" })).toBeInTheDocument();
  });

  it("forwards click handlers", async () => {
    const onClick = vi.fn();
    render(<PressableSurface onClick={onClick}>Tap</PressableSurface>);
    await userEvent.click(screen.getByRole("button", { name: "Tap" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("emits a ripple element on pointer down", () => {
    render(<PressableSurface>Tap</PressableSurface>);
    const btn = screen.getByRole("button", { name: "Tap" });
    fireEvent.pointerDown(btn, { clientX: 12, clientY: 14 });
    expect(btn.querySelector(".ripple")).not.toBeNull();
  });

  it("respects noRipple", () => {
    render(<PressableSurface noRipple>Tap</PressableSurface>);
    const btn = screen.getByRole("button", { name: "Tap" });
    fireEvent.pointerDown(btn);
    expect(btn.querySelector(".ripple")).toBeNull();
  });

  it("renders as a custom element via `as`", () => {
    render(
      <PressableSurface as="a" href="/x">
        Go
      </PressableSurface>,
    );
    expect(screen.getByRole("link", { name: "Go" })).toBeInTheDocument();
  });

  it("cleans up ripple node after the animation timeout", () => {
    vi.useFakeTimers();
    try {
      render(<PressableSurface>Tap</PressableSurface>);
      const btn = screen.getByRole("button", { name: "Tap" });
      fireEvent.pointerDown(btn, { clientX: 4, clientY: 4 });
      expect(btn.querySelector(".ripple")).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(btn.querySelector(".ripple")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
