import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./app-header";

describe("AppHeader", () => {
  it("renders the status bar by default", () => {
    render(<AppHeader />);
    expect(screen.getByText("VIOLETTA · OPEN")).toBeInTheDocument();
  });

  it("hides the status bar when showStatusBar is false", () => {
    render(<AppHeader showStatusBar={false} />);
    expect(screen.queryByText("VIOLETTA · OPEN")).not.toBeInTheDocument();
  });

  it("renders the wordmark and a labelled menu button", () => {
    render(<AppHeader />);
    expect(screen.getByText("Violetta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
  });

  it("uses a custom ariaMenuLabel when provided", () => {
    render(<AppHeader ariaMenuLabel="Show navigation" />);
    expect(
      screen.getByRole("button", { name: /show navigation/i }),
    ).toBeInTheDocument();
  });

  it("allows replacing the menu button entirely via the menuButton slot", () => {
    render(
      <AppHeader
        menuButton={
          <button type="button" aria-label="Custom action">
            Custom
          </button>
        }
      />,
    );
    expect(
      screen.queryByRole("button", { name: /open menu/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /custom action/i }),
    ).toBeInTheDocument();
  });
});
