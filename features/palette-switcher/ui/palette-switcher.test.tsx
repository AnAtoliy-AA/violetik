import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { PALETTES, PALETTE_COOKIE } from "@/shared/config/palettes";
import { PaletteSwitcher } from "./palette-switcher";

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PaletteSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("PaletteSwitcher", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-palette", "aubergine");
    document.cookie = `${PALETTE_COOKIE}=; path=/; max-age=0`;
  });

  it("renders one radio button per palette", () => {
    renderSwitcher();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(PALETTES.length);
  });

  it("the initial aria-checked matches the data-palette attribute", () => {
    document.documentElement.setAttribute("data-palette", "rose");
    renderSwitcher();
    const rose = screen.getByRole("radio", { name: /Rose/i });
    expect(rose).toHaveAttribute("aria-checked", "true");
  });

  it("clicking a palette updates aria-checked, the html attribute, and the cookie", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    const moss = screen.getByRole("radio", { name: /Moss/i });
    await user.click(moss);
    expect(moss).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.getAttribute("data-palette")).toBe("moss");
    expect(document.cookie).toContain(`${PALETTE_COOKIE}=moss`);
  });

  it("only one palette is selected at a time", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("radio", { name: /Ruby/i }));
    await user.click(screen.getByRole("radio", { name: /Ink/i }));
    const checked = screen
      .getAllByRole("radio")
      .filter((el) => el.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent).toMatch(/Ink/);
  });
});

// Silence the test runner warning when this file is run in isolation;
// the registry change shape is covered separately in shared/config/palettes.
void vi;
