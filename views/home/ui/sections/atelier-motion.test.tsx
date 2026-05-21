import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import be from "@/messages/be.json";
import { AtelierMotion } from "./atelier-motion";

function renderWithLocale(locale: "en" | "ru" | "be", messages: object) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AtelierMotion />
    </NextIntlClientProvider>,
  );
}

describe("AtelierMotion", () => {
  it("renders the three captions in English", () => {
    renderWithLocale("en", en);
    expect(screen.getByText(en.Home.atelier_motion_caption_buff)).toBeInTheDocument();
    expect(screen.getByText(en.Home.atelier_motion_caption_polish)).toBeInTheDocument();
    expect(screen.getByText(en.Home.atelier_motion_caption_design)).toBeInTheDocument();
  });

  it("renders the Russian translations", () => {
    renderWithLocale("ru", ru);
    expect(screen.getByText(ru.Home.atelier_motion_caption_buff)).toBeInTheDocument();
    expect(screen.getByText(ru.Home.atelier_motion_caption_polish)).toBeInTheDocument();
    expect(screen.getByText(ru.Home.atelier_motion_caption_design)).toBeInTheDocument();
  });

  it("renders the Belarusian translations", () => {
    renderWithLocale("be", be);
    expect(screen.getByText(be.Home.atelier_motion_caption_buff)).toBeInTheDocument();
    expect(screen.getByText(be.Home.atelier_motion_caption_polish)).toBeInTheDocument();
    expect(screen.getByText(be.Home.atelier_motion_caption_design)).toBeInTheDocument();
  });

  it("renders three figure cards with palette placeholders", () => {
    renderWithLocale("en", en);
    expect(document.querySelectorAll("figure")).toHaveLength(3);
  });
});
