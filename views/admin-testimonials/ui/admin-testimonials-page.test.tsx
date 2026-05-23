import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { AdminTestimonialRow } from "@/db/testimonials";

// next-intl's createNavigation pulls in next/navigation, which Vitest's
// jsdom project can't resolve under ESM. Stub the locale-aware Link with
// a plain anchor — routing isn't what these tests are exercising.
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
  usePathname: () => "/admin/testimonials",
  useRouter: () => ({ replace: vi.fn() }),
}));

import { AdminTestimonialsPage } from "./admin-testimonials-page";

// Mock the entire feature slice to avoid the next-auth → next/server chain
// that vi.importActual would trigger in jsdom. We only need the two components.
vi.mock("@/features/testimonials-admin", () => ({
  DecisionActions: (props: { testimonialId: string }) => (
    <div data-testid="slot">slot-{props.testimonialId}</div>
  ),
  TestimonialRow: ({
    row,
    decisionSlot,
  }: {
    row: { id: string; body: string };
    decisionSlot?: ReactNode;
  }) => (
    <li data-testid={`row-${row.id}`}>
      {row.body}
      {decisionSlot}
    </li>
  ),
}));

function makeRow(overrides: Partial<AdminTestimonialRow> = {}): AdminTestimonialRow {
  return {
    id: "tst_1",
    body: "Body text",
    status: "pending",
    createdAt: new Date("2026-05-20T10:00:00Z"),
    decidedAt: null,
    userId: "tg:42",
    authorFirstName: "Lara",
    authorLastName: null,
    authorUsername: null,
    authorEmail: null,
    authorPhotoUrl: null,
    masterId: "violetta",
    masterNameEn: "Violetta",
    masterNameRu: "Виолетта",
    masterNameBy: "Віялета",
    ...overrides,
  };
}

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AdminTestimonialsPage", () => {
  it("renders three section headings with counts", () => {
    renderWithIntl(
      <AdminTestimonialsPage
        locale="en"
        pending={[makeRow({ id: "tst_p" })]}
        approved={[makeRow({ id: "tst_a", status: "approved" })]}
        rejected={[]}
      />,
    );
    expect(screen.getByText(/Pending \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Approved \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Rejected \(0\)/)).toBeInTheDocument();
  });

  it("wires the DecisionActions slot only for pending rows", () => {
    renderWithIntl(
      <AdminTestimonialsPage
        locale="en"
        pending={[makeRow({ id: "tst_p" })]}
        approved={[makeRow({ id: "tst_a", status: "approved" })]}
        rejected={[makeRow({ id: "tst_r", status: "rejected" })]}
      />,
    );
    expect(screen.getByTestId("slot")).toHaveTextContent("slot-tst_p");
    expect(screen.getAllByTestId("slot")).toHaveLength(1);
  });

  it("shows empty-state copy per section", () => {
    renderWithIntl(
      <AdminTestimonialsPage locale="en" pending={[]} approved={[]} rejected={[]} />,
    );
    expect(
      screen.getByText(/No pending reviews\. New submissions land here\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing approved yet\./)).toBeInTheDocument();
    expect(screen.getByText(/No rejected reviews\./)).toBeInTheDocument();
  });
});
