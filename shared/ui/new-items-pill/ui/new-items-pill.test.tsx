import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewItemsPill } from "./new-items-pill";

describe("NewItemsPill", () => {
  it("renders the provided label", () => {
    render(<NewItemsPill count={3} label="3 new — refresh" onClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: /3 new — refresh/i }),
    ).toBeInTheDocument();
  });

  it("invokes onClick when clicked", () => {
    const onClick = vi.fn();
    render(<NewItemsPill count={1} label="1 new — refresh" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("exposes the count as data-count for tests/styling", () => {
    render(<NewItemsPill count={7} label="7 new — refresh" onClick={() => {}} />);
    expect(screen.getByTestId("new-items-pill").getAttribute("data-count")).toBe("7");
  });
});
