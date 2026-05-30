import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const refreshSpy = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshSpy }),
}));

import { BookingsRefreshControls } from "./bookings-refresh";

const messages = {
  AdminBookings: {
    cta_refresh: "Refresh",
    n_new_pending: "{n} new — refresh",
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setVisible(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

const fetchSpy = vi.spyOn(global, "fetch");

function defaultProps(
  overrides: Partial<React.ComponentProps<typeof BookingsRefreshControls>> = {},
) {
  return {
    initialPendingCount: 2,
    ...overrides,
  };
}

async function flushPromises() {
  // Two microtask flushes — one for the fetch response, one for state setters.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("BookingsRefreshControls", () => {
  beforeEach(() => {
    refreshSpy.mockReset();
    fetchSpy.mockReset();
    setVisible("visible");
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires an immediate fetch on mount", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    renderWithIntl(<BookingsRefreshControls {...defaultProps()} />);
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/bookings/pending-count",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("does not show the pill when count equals baseline", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    renderWithIntl(<BookingsRefreshControls {...defaultProps()} />);
    await flushPromises();
    expect(screen.queryByTestId("new-items-pill")).not.toBeInTheDocument();
  });

  it("shows the pill with the delta when count exceeds baseline", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 5 }));
    renderWithIntl(
      <BookingsRefreshControls {...defaultProps({ initialPendingCount: 2 })} />,
    );
    await flushPromises();
    const pill = await screen.findByTestId("new-items-pill");
    expect(pill.getAttribute("data-count")).toBe("3");
    expect(pill).toHaveTextContent("3 new — refresh");
  });

  it("polls again after 30 seconds", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    renderWithIntl(<BookingsRefreshControls {...defaultProps()} />);
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("skips fetching when the tab is hidden", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    renderWithIntl(<BookingsRefreshControls {...defaultProps()} />);
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setVisible("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("clicking the pill triggers router.refresh and resets the baseline", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 5 }));
    renderWithIntl(
      <BookingsRefreshControls {...defaultProps({ initialPendingCount: 2 })} />,
    );
    await flushPromises();

    const pill = await screen.findByTestId("new-items-pill");
    await act(async () => {
      pill.click();
    });
    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("new-items-pill")).not.toBeInTheDocument();
  });

  it("on visibilitychange to visible, triggers router.refresh", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    renderWithIntl(<BookingsRefreshControls {...defaultProps()} />);
    await flushPromises();
    refreshSpy.mockClear();

    setVisible("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).toHaveBeenCalled();
  });

  it("logs and survives a fetch failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    fetchSpy.mockResolvedValue(jsonResponse({ count: 4 }));

    renderWithIntl(
      <BookingsRefreshControls {...defaultProps({ initialPendingCount: 2 })} />,
    );
    await flushPromises();
    // First call failed — no pill yet.
    expect(screen.queryByTestId("new-items-pill")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(await screen.findByTestId("new-items-pill")).toBeInTheDocument();

    warn.mockRestore();
  });
});
