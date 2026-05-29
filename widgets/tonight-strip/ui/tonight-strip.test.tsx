import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/lib/analytics/emit", () => ({
  emitAnalytics: vi.fn(),
}));

import { TonightStripClient } from "./tonight-strip-client";

const messages = {
  Tonight: {
    label: "Tonight in the studio",
    today: "TODAY",
    none_today_tomorrow:
      "· NO OPENINGS TODAY OR TOMORROW · SEE THE CALENDAR ·",
    dismiss: "Hide tonight's openings",
  },
};

const sampleData = {
  slots: [
    {
      time: "15:00",
      serviceId: "svc-1",
      dayLabel: "TODAY",
      isToday: true,
      dateISO: "2026-05-25",
    },
    {
      time: "11:00",
      serviceId: "svc-1",
      dayLabel: "TUE",
      isToday: false,
      dateISO: "2026-05-26",
    },
  ],
};

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("TonightStrip — glass ribbon", () => {
  it("renders the ribbon as a GlassSurface", () => {
    render(wrap(<TonightStripClient data={sampleData} />));
    const candidates = document.querySelectorAll("[data-glass='true']");
    const ribbon = Array.from(candidates).find((el) =>
      el.className.includes("glass-warm"),
    );
    expect(ribbon).not.toBeUndefined();
    expect((ribbon as HTMLElement).className).toMatch(/glass-md/);
  });

  it("labels today's and tomorrow's slots and links each into step 1", () => {
    const { getAllByRole } = render(
      wrap(<TonightStripClient data={sampleData} />),
    );
    // Marquee duplicates its track, so each slot appears twice. Day + time
    // only — no service name in the label.
    const today = getAllByRole("link", { name: "TODAY 15:00" });
    const tomorrow = getAllByRole("link", { name: "TUE 11:00" });
    expect(today.length).toBeGreaterThan(0);
    expect(tomorrow.length).toBeGreaterThan(0);
    // Both land on step 1 (service) with the ritual preselected and the
    // chosen day + time carried so the later "when" step opens prefilled.
    expect(today[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/booking/service"),
    );
    expect(today[0]).toHaveAttribute("href", expect.stringContaining("selected=svc-1"));
    expect(today[0]).toHaveAttribute(
      "href",
      expect.stringContaining("date=2026-05-25"),
    );
    expect(today[0]).toHaveAttribute("href", expect.stringContaining("time=15"));
    expect(tomorrow[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/booking/service"),
    );
    expect(tomorrow[0]).toHaveAttribute(
      "href",
      expect.stringContaining("date=2026-05-26"),
    );
  });

  it("shows the no-openings line when both days are full", () => {
    const { getByRole } = render(
      wrap(<TonightStripClient data={{ slots: [] }} />),
    );
    const link = getByRole("link", {
      name: /NO OPENINGS TODAY OR TOMORROW/,
    });
    expect(link).toHaveAttribute("href", "/booking");
  });
});
