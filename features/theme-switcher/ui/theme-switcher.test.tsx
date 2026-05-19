import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { ThemeSwitcher } from "./theme-switcher";

describe("ThemeSwitcher", () => {
  it("renders the translated label and options", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ThemeSwitcher />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Theme:")).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Theme" });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "System" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dark" })).toBeInTheDocument();
  });
});
