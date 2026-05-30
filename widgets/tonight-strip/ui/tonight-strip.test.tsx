import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
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

import {
  TonightStripClient,
  type TonightStripDay,
} from "./tonight-strip-client";

const messages = {
  Tonight: {
    label: "Tonight in the studio",
    today: "TODAY",
    none_today_tomorrow:
      "· NO OPENINGS TODAY OR TOMORROW · SEE THE CALENDAR ·",
    dismiss: "Hide tonight's openings",
  },
};

const DAYS: TonightStripDay[] = [
  { dateISO: "2026-05-25", dayLabel: "TODAY", isToday: true },
  { dateISO: "2026-05-26", dayLabel: "TUE", isToday: false },
];

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

/** Mock the live slots endpoint: date → available "HH:MM" times. */
function mockSlots(byDate: Record<string, string[]>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const date = new URL(url, "http://x").searchParams.get("date") ?? "";
    return Promise.resolve(
      new Response(JSON.stringify({ slots: byDate[date] ?? [] }), {
        status: 200,
      }),
    );
  });
}

beforeEach(() => {
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TonightStrip — live availability ribbon", () => {
  it("renders only the times the slots endpoint returns", async () => {
    mockSlots({ "2026-05-25": ["16:00"], "2026-05-26": ["10:00"] });
    render(wrap(<TonightStripClient serviceId="svc-1" days={DAYS} />));

    // Marquee duplicates its track, so each slot appears twice.
    const today = await screen.findAllByRole("link", { name: "TODAY 16:00" });
    const tomorrow = await screen.findAllByRole("link", { name: "TUE 10:00" });
    expect(today.length).toBeGreaterThan(0);
    expect(tomorrow.length).toBeGreaterThan(0);

    // A time the endpoint did NOT return must never appear.
    expect(screen.queryByRole("link", { name: "TODAY 11:00" })).toBeNull();
  });

  it("links each open slot into step 1 with selected + date + time", async () => {
    mockSlots({ "2026-05-25": ["16:00"], "2026-05-26": [] });
    render(wrap(<TonightStripClient serviceId="svc-1" days={DAYS} />));

    const today = await screen.findAllByRole("link", { name: "TODAY 16:00" });
    expect(today[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/booking/service"),
    );
    expect(today[0]).toHaveAttribute(
      "href",
      expect.stringContaining("selected=svc-1"),
    );
    expect(today[0]).toHaveAttribute(
      "href",
      expect.stringContaining("date=2026-05-25"),
    );
    expect(today[0]).toHaveAttribute("href", expect.stringContaining("time=16"));
  });

  it("shows the no-openings line when the endpoint returns nothing", async () => {
    mockSlots({ "2026-05-25": [], "2026-05-26": [] });
    render(wrap(<TonightStripClient serviceId="svc-1" days={DAYS} />));

    const link = await screen.findByRole("link", {
      name: /NO OPENINGS TODAY OR TOMORROW/,
    });
    expect(link).toHaveAttribute("href", "/booking");
  });

  it("shows the no-openings line when there is no service to query", async () => {
    const spy = mockSlots({});
    render(wrap(<TonightStripClient serviceId={null} days={DAYS} />));

    const link = await screen.findByRole("link", {
      name: /NO OPENINGS TODAY OR TOMORROW/,
    });
    expect(link).toHaveAttribute("href", "/booking");
    expect(spy).not.toHaveBeenCalled();
  });

  it("renders the ribbon as a GlassSurface", async () => {
    mockSlots({ "2026-05-25": ["16:00"], "2026-05-26": [] });
    render(wrap(<TonightStripClient serviceId="svc-1" days={DAYS} />));
    await screen.findAllByRole("link", { name: "TODAY 16:00" });

    const candidates = document.querySelectorAll("[data-glass='true']");
    const ribbon = Array.from(candidates).find((el) =>
      el.className.includes("glass-warm"),
    );
    expect(ribbon).not.toBeUndefined();
    expect((ribbon as HTMLElement).className).toMatch(/glass-md/);
  });
});
