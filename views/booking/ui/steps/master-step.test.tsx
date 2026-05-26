import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const routerReplace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ replace: routerReplace }),
}));

import { MasterStep } from "./master-step";
import { useBookingStore } from "@/views/booking/model/booking-store";

const masters = [
  {
    id: "violetta",
    name: "Violetta",
    role: "Master nail artist",
    bio: "",
    quote: "",
    years: 11,
    setsLabel: "600+",
    sortOrder: 0,
    status: "published" as const,
    serviceIds: ["signature"],
  },
  {
    id: "iris",
    name: "Iris",
    role: "Apprentice",
    bio: "",
    quote: "",
    years: 3,
    setsLabel: "",
    sortOrder: 1,
    status: "published" as const,
    serviceIds: ["signature"],
  },
];

function setup(serviceId: string | null = "signature") {
  useBookingStore.setState({ serviceId, masterId: null });
  routerReplace.mockClear();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MasterStep masters={masters} />
    </NextIntlClientProvider>,
  );
}

describe("MasterStep", () => {
  it("renders every master eligible for the chosen service", () => {
    setup();
    expect(screen.getByText("Violetta")).toBeVisible();
    expect(screen.getByText("Iris")).toBeVisible();
  });
  it("filters out masters who don't perform the chosen service", () => {
    const onlyVioletta = masters.map((m) =>
      m.id === "iris" ? { ...m, serviceIds: ["editorial"] } : m,
    );
    useBookingStore.setState({ serviceId: "signature", masterId: null });
    routerReplace.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MasterStep masters={onlyVioletta} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Violetta")).toBeVisible();
    expect(screen.queryByText("Iris")).toBeNull();
  });
  it("clicking a card sets the masterId in the booking store", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Violetta/ }));
    expect(useBookingStore.getState().masterId).toBe("violetta");
  });
  it("renders the empty-set fallback when no master performs the service", () => {
    setup("only-orphan-service");
    expect(screen.getByText(/No master is currently set up/i)).toBeVisible();
  });
  it("auto-skips to /booking/when when exactly one master is eligible", () => {
    const onlyVioletta = masters.map((m) =>
      m.id === "iris" ? { ...m, serviceIds: ["editorial"] } : m,
    );
    useBookingStore.setState({ serviceId: "signature", masterId: null });
    routerReplace.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MasterStep masters={onlyVioletta} />
      </NextIntlClientProvider>,
    );
    expect(useBookingStore.getState().masterId).toBe("violetta");
    expect(routerReplace).toHaveBeenCalledWith("/booking/when");
  });
});
