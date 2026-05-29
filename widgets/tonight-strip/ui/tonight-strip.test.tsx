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
    fully_booked: "· FULLY BOOKED TONIGHT · NEXT {day} · {time} {service} ·",
    dismiss: "Hide tonight's openings",
  },
};

const sampleData = {
  isToday: true,
  time: "20:00",
  service: "Haircut",
  serviceId: "svc-1",
  laterSlots: [],
};

describe("TonightStrip — glass ribbon", () => {
  it("renders the ribbon as a GlassSurface", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TonightStripClient data={sampleData} />
      </NextIntlClientProvider>,
    );
    const candidates = document.querySelectorAll("[data-glass='true']");
    const ribbon = Array.from(candidates).find((el) =>
      el.className.includes("glass-warm"),
    );
    expect(ribbon).not.toBeUndefined();
    expect((ribbon as HTMLElement).className).toMatch(/glass-md/);
  });
});
