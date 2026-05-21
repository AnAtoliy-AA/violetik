import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryChips } from "./category-chips";

describe("CategoryChips", () => {
  const args = {
    categories: ["All", "Care", "Gel"] as const,
    labels: { All: "All", Care: "Care", Gel: "Gel" },
    ariaLabel: "Filter",
    onChange: vi.fn(),
  };

  it("renders the selected chip with the gold foil styling", () => {
    render(<CategoryChips {...args} active="Care" />);
    const careChip = screen.getByRole("tab", { name: "Care" });
    expect(careChip).toHaveAttribute("aria-selected", "true");
    expect(careChip).toHaveClass("bg-gold");
  });

  it("renders unselected chips with the gilded gold-hairline border", () => {
    render(<CategoryChips {...args} active="Care" />);
    const gelChip = screen.getByRole("tab", { name: "Gel" });
    expect(gelChip).toHaveAttribute("aria-selected", "false");
    expect(gelChip).toHaveClass("gilded");
  });
});
