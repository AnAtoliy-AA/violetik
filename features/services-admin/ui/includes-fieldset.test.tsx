import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { IncludesFieldset } from "./includes-fieldset";

function render2(items: { en: string; ru: string; be: string }[]) {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <IncludesFieldset items={items} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange };
}

describe("IncludesFieldset", () => {
  it("renders an Add button when fewer than 8 bullets exist", () => {
    render2([]);
    expect(
      screen.getByRole("button", { name: /Add bullet/i }),
    ).not.toBeDisabled();
  });

  it("disables Add when 8 bullets are already present", () => {
    const eight = Array.from({ length: 8 }, () => ({
      en: "a",
      ru: "а",
      be: "а",
    }));
    render2(eight);
    expect(
      screen.getByRole("button", { name: /Add bullet/i }),
    ).toBeDisabled();
  });

  it("fires onChange with a new empty row when Add is clicked", async () => {
    const { onChange } = render2([{ en: "x", ru: "x", be: "x" }]);
    await userEvent.setup().click(
      screen.getByRole("button", { name: /Add bullet/i }),
    );
    expect(onChange).toHaveBeenCalledWith([
      { en: "x", ru: "x", be: "x" },
      { en: "", ru: "", be: "" },
    ]);
  });

  it("fires onChange with the row removed when Remove is clicked", async () => {
    const { onChange } = render2([
      { en: "a", ru: "а", be: "а" },
      { en: "b", ru: "б", be: "б" },
    ]);
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    await userEvent.setup().click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([{ en: "b", ru: "б", be: "б" }]);
  });
});
