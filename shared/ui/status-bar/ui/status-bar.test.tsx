import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./status-bar";

describe("StatusBar", () => {
  it("renders default time, label and signal", () => {
    render(<StatusBar />);
    expect(screen.getByText("9:41")).toBeInTheDocument();
    expect(screen.getByText("VIOLETTA · OPEN")).toBeInTheDocument();
    expect(screen.getByText("5G")).toBeInTheDocument();
  });

  it("honors custom time, label, signal props", () => {
    render(<StatusBar time="11:30" label="VIOLETTA · BOOKED" signal="WIFI" />);
    expect(screen.getByText("11:30")).toBeInTheDocument();
    expect(screen.getByText("VIOLETTA · BOOKED")).toBeInTheDocument();
    expect(screen.getByText("WIFI")).toBeInTheDocument();
  });

  it("merges incoming className with internal layout classes", () => {
    const { container } = render(<StatusBar className="opacity-50" />);
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(container.firstChild).toHaveClass("font-mono");
  });
});
