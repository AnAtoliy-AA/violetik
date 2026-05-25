import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HotSlot } from "./hot-slot";

describe("HotSlot", () => {
  it("renders default popular variant", () => {
    render(<HotSlot />);
    expect(screen.getByText("POPULAR")).toBeInTheDocument();
  });

  it("renders last-one variant label and sr-only message", () => {
    render(<HotSlot variant="last-one" />);
    expect(screen.getByText("LAST ONE")).toBeInTheDocument();
    expect(screen.getByText("Only one slot remaining")).toBeInTheDocument();
  });

  it("renders new variant", () => {
    render(<HotSlot variant="new" />);
    expect(screen.getByText("NEW")).toBeInTheDocument();
    expect(screen.getByText("Recently added")).toBeInTheDocument();
  });

  it("accepts a custom label override", () => {
    render(<HotSlot variant="popular" label="MOST BOOKED" />);
    expect(screen.getByText("MOST BOOKED")).toBeInTheDocument();
    expect(screen.getByText("Popular choice")).toBeInTheDocument();
  });
});
