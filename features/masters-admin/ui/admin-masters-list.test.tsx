import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AdminMastersList } from "./admin-masters-list";

const masters = [
  {
    id: "violetta",
    name: "Violetta",
    role: "Master",
    status: "published" as const,
    serviceCount: 3,
  },
  {
    id: "old-master",
    name: "Old Master",
    role: "Apprentice",
    status: "archived" as const,
    serviceCount: 0,
  },
];

function setup() {
  const reorder = vi.fn(async () => ({ ok: true as const }));
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminMastersList masters={masters} reorderMastersAction={reorder} />
    </NextIntlClientProvider>,
  );
  return { reorder };
}

describe("AdminMastersList", () => {
  it("renders the Published heading", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /^Published$/i }),
    ).toBeVisible();
  });
  it("renders the Archived heading", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /^Archived$/i }),
    ).toBeVisible();
  });
  it("shows the specialty count badge on each active row", () => {
    setup();
    expect(screen.getByText(/3 services/)).toBeVisible();
  });
  it("links published rows to /admin/masters/{id}", () => {
    setup();
    const link = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href")?.endsWith("/admin/masters/violetta"));
    expect(link).toBeTruthy();
  });
});
