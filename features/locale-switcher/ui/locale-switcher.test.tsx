import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

const messages = {
  LocaleSwitcher: { label: "Language", en: "English", ru: "Russian", be: "Belarusian" },
};

function renderAt(locale: "en" | "ru" | "be") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("renders one radio per supported locale with uppercase single-character label", () => {
    renderAt("en");
    expect(screen.getByRole("radio", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "RU" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "BE" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /language/i })).toBeInTheDocument();
  });

  it("marks the active locale aria-checked=true", () => {
    renderAt("ru");
    expect(screen.getByRole("radio", { name: "RU" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "EN" })).toHaveAttribute("aria-checked", "false");
  });
});
