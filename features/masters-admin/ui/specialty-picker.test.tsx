import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { SpecialtyPicker } from "./specialty-picker";

const services = [
  {
    id: "signature",
    name: "Signature",
    categoryId: "care",
    categoryName: "Care",
  },
  { id: "gel", name: "Gel", categoryId: "gel", categoryName: "Gel" },
];

function setup(initial: string[] = []) {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SpecialtyPicker services={services} value={initial} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

describe("SpecialtyPicker", () => {
  it("ticks the initially-selected services", () => {
    setup(["gel"]);
    expect(screen.getByLabelText("Signature")).not.toBeChecked();
    expect(screen.getByLabelText("Gel")).toBeChecked();
  });
  it("toggles a service and emits onChange", async () => {
    const { onChange } = setup([]);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Gel"));
    expect(onChange).toHaveBeenCalledWith(["gel"]);
  });
  it("Select all selects every service in the category", async () => {
    const { onChange } = setup([]);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: /Select all/ })[0]);
    expect(onChange).toHaveBeenCalled();
    const args = onChange.mock.calls[0][0] as string[];
    expect(args).toContain("signature");
  });
});
