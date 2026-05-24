import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableList } from "./sortable-list";

interface Item {
  id: string;
  label: string;
}

const items: Item[] = [
  { id: "a", label: "Apple" },
  { id: "b", label: "Banana" },
];

describe("SortableList", () => {
  it("renders one row per item with a drag handle and label", () => {
    render(
      <SortableList
        items={items}
        onReorder={vi.fn()}
        renderRow={(item) => <span>{item.label}</span>}
      />,
    );
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /drag/i }).length).toBe(2);
  });
});
