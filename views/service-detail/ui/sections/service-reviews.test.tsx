import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ApprovedTestimonial } from "@/entities/testimonial";
import { ServiceReviews } from "./service-reviews";

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>,
  );
}

const review = (overrides: Partial<ApprovedTestimonial> = {}): ApprovedTestimonial => ({
  id: "r-1",
  body: "The hour disappeared, the result did not.",
  createdAt: new Date("2025-11-01T00:00:00Z"),
  masterId: "violetta",
  authorDisplay: "Anna",
  authorPhotoUrl: null,
  authorIsVip: false,
  ...overrides,
});

describe("ServiceReviews", () => {
  it("hides itself when no reviews are passed", () => {
    const { container } = renderWithIntl(<ServiceReviews reviews={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the quote body and the author display", () => {
    renderWithIntl(<ServiceReviews reviews={[review()]} />);
    expect(
      screen.getAllByText(/hour disappeared/, { exact: false })[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Anna/)[0]).toBeInTheDocument();
  });

  it("shows the VERIFIED stamp when the testimonial has a matched booking", () => {
    renderWithIntl(
      <ServiceReviews reviews={[review({ hasMatchedBooking: true })]} />,
    );
    expect(screen.getAllByText("VERIFIED")[0]).toBeInTheDocument();
  });

  it("does NOT show the VERIFIED stamp for unmatched (or undefined) bookings", () => {
    renderWithIntl(<ServiceReviews reviews={[review()]} />);
    expect(screen.queryByText("VERIFIED")).toBeNull();
  });
});
