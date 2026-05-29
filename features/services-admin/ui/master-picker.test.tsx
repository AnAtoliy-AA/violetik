import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { MasterPicker } from "./master-picker";

const masters = [
  { id: "violetik", name: "Violetik" },
  { id: "anna-k", name: "Anna K" },
];

function setup(initial: string[] = []) {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MasterPicker masters={masters} value={initial} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

describe("MasterPicker", () => {
  it("ticks the initially-selected masters", () => {
    setup(["anna-k"]);
    expect(screen.getByLabelText("Violetik")).not.toBeChecked();
    expect(screen.getByLabelText("Anna K")).toBeChecked();
  });
  it("toggles a master and emits onChange", async () => {
    const { onChange } = setup([]);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Anna K"));
    expect(onChange).toHaveBeenCalledWith(["anna-k"]);
  });
  it("removes a master that is already selected", async () => {
    const { onChange } = setup(["violetik", "anna-k"]);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Violetik"));
    expect(onChange).toHaveBeenCalledWith(["anna-k"]);
  });
});
