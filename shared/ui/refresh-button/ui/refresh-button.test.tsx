import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const refreshSpy = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshSpy }),
}));

import { RefreshButton } from "./refresh-button";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

describe("RefreshButton", () => {
  beforeEach(() => {
    refreshSpy.mockReset();
    setVisibility("visible");
  });

  afterEach(() => {
    setVisibility("visible");
  });

  it("renders a button with the provided aria-label", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    expect(
      screen.getByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();
  });

  it("calls router.refresh() on click", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refreshSpy).toHaveBeenCalledOnce();
  });

  it("calls onRefresh after triggering a refresh", () => {
    const onRefresh = vi.fn();
    render(<RefreshButton ariaLabel="Refresh" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("refreshes when the tab becomes visible", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    setVisibility("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).toHaveBeenCalledOnce();
  });

  it("does not refresh on visibilitychange when disableVisibilityRefresh is set", () => {
    render(<RefreshButton ariaLabel="Refresh" disableVisibilityRefresh />);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("does not refresh when visibility changes to hidden", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    setVisibility("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
