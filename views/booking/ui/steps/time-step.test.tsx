import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { TimeStep } from "./time-step";
import { useBookingStore } from "@/views/booking/model/booking-store";

describe("TimeStep", () => {
  beforeEach(() => {
    useBookingStore.setState({
      date: "2026-05-19",
      time: null,
      serviceId: "signature",
    });
    vi.restoreAllMocks();
  });

  it("fetches /api/booking/slots and renders the returned slots", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ source: "static", slots: ["10:00", "10:30"] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TimeStep />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("10:00")).toBeInTheDocument(),
    );
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("renders a non-empty fallback list when the fetch rejects", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("net"));
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TimeStep />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getAllByRole("button").length).toBeGreaterThan(0),
    );
  });
});
