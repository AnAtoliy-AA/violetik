import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

import { MergePicker } from "./merge-picker";

const baseProps = {
  userId: "google:abc",
  placeholderLabel: "Select another user…",
  mergeWithLabel: "Merge with…",
  emptyLabel: "No other users to merge with.",
};

describe("MergePicker", () => {
  it("renders empty state when there are no options", () => {
    render(<MergePicker {...baseProps} options={[]} />);
    expect(
      screen.getByText("No other users to merge with."),
    ).toBeInTheDocument();
  });

  it("disables the button until an option is selected, then submits with the chosen id", () => {
    const onSubmit = vi.fn();
    render(
      <MergePicker
        {...baseProps}
        options={[
          { id: "tg:1", displayName: "Violetta" },
          { id: "google:xyz", displayName: "Marina" },
        ]}
        onSubmit={onSubmit}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Merge with…",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "tg:1" },
    });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith("tg:1");
  });
});
