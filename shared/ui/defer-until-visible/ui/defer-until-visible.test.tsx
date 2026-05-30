import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { DeferUntilVisible } from "./defer-until-visible";

type ObserverCallback = (entries: ReadonlyArray<{ isIntersecting: boolean }>) => void;

const observerInstances: Array<{ cb: ObserverCallback; disconnect: () => void }> = [];

beforeEach(() => {
  observerInstances.length = 0;
  class FakeIO {
    cb: ObserverCallback;
    constructor(cb: ObserverCallback) {
      this.cb = cb;
      observerInstances.push({ cb, disconnect: vi.fn() });
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords(): Array<{ isIntersecting: boolean }> {
      return [];
    }
  }
  (globalThis as { IntersectionObserver?: typeof FakeIO }).IntersectionObserver = FakeIO;
});

describe("DeferUntilVisible", () => {
  it("renders the placeholder before the IntersectionObserver fires", () => {
    render(
      <DeferUntilVisible placeholder={<span>placeholder</span>}>
        <span>heavy</span>
      </DeferUntilVisible>,
    );
    expect(screen.getByText("placeholder")).toBeInTheDocument();
    expect(screen.queryByText("heavy")).toBeNull();
  });

  it("renders the real subtree once the observer reports visibility", () => {
    render(
      <DeferUntilVisible placeholder={<span>placeholder</span>}>
        <span>heavy</span>
      </DeferUntilVisible>,
    );
    act(() => {
      observerInstances[0]?.cb([{ isIntersecting: true }]);
    });
    expect(screen.getByText("heavy")).toBeInTheDocument();
  });
});
