import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiquidPress } from "./use-liquid-press";

function fireEv(el: HTMLElement, type: string, props: Partial<PointerEvent> = {}) {
  const ev = new Event(type, { bubbles: true }) as unknown as PointerEvent;
  Object.assign(ev, { clientX: 50, clientY: 25, ...props });
  el.dispatchEvent(ev);
}

function renderHookWithRef() {
  const target = document.createElement("div");
  Object.defineProperty(target, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => ({}) }),
  });
  document.body.appendChild(target);
  const ref = { current: target };
  const { result } = renderHook(() => useLiquidPress(ref as React.RefObject<HTMLElement>));
  return { ref, target, result };
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
});
afterEach(() => { document.body.innerHTML = ""; });

describe("useLiquidPress", () => {
  it("writes --lx / --ly on pointermove", () => {
    const { target } = renderHookWithRef();
    act(() => fireEv(target, "pointermove", { clientX: 50, clientY: 25 }));
    expect(target.style.getPropertyValue("--lx")).toBe("50%");
    expect(target.style.getPropertyValue("--ly")).toBe("50%");
  });

  it("sets data-active on pointerdown and clears on pointerup", () => {
    const { target, result } = renderHookWithRef();
    act(() => fireEv(target, "pointerdown", { clientX: 25, clientY: 10 }));
    expect(target.getAttribute("data-active")).toBe("true");
    expect(result.current.pressed).toBe(true);
    act(() => fireEv(target, "pointerup"));
    expect(target.getAttribute("data-active")).toBeNull();
    expect(result.current.pressed).toBe(false);
  });

  it("clears data-active on pointercancel", () => {
    const { target } = renderHookWithRef();
    act(() => fireEv(target, "pointerdown"));
    expect(target.getAttribute("data-active")).toBe("true");
    act(() => fireEv(target, "pointercancel"));
    expect(target.getAttribute("data-active")).toBeNull();
  });

  it("is a no-op when prefers-reduced-motion: reduce", () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("reduce"), media: q, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    const { target } = renderHookWithRef();
    act(() => fireEv(target, "pointermove", { clientX: 75, clientY: 25 }));
    expect(target.style.getPropertyValue("--lx")).toBe("");
  });
});
