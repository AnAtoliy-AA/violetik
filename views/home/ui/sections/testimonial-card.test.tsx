import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import { TestimonialCard } from "./testimonial-card";
import type { ApprovedTestimonial } from "@/entities/testimonial";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TestimonialCard", () => {
  it("renders the body and author when a testimonial is provided", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_1",
      body: "Quiet, private, exquisite.",
      createdAt: new Date(),
      authorDisplay: "Iris M.",
      authorPhotoUrl: null,
      authorIsVip: false,
      masterId: "violetta",
    };
    renderWithIntl(<TestimonialCard testimonial={tm} />);
    expect(screen.getByText(/Quiet, private, exquisite/)).toBeInTheDocument();
    expect(screen.getByText("Iris M.")).toBeInTheDocument();
  });

  it("renders a VIP badge when the author is a VIP", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_vip",
      body: "Truly couture.",
      createdAt: new Date(),
      authorDisplay: "Nina V.",
      authorPhotoUrl: null,
      authorIsVip: true,
      masterId: "violetta",
    };
    renderWithIntl(<TestimonialCard testimonial={tm} />);
    expect(screen.getByLabelText("VIP member")).toBeInTheDocument();
  });

  it("renders an <img> avatar when authorPhotoUrl is set", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_2",
      body: "Magical experience.",
      createdAt: new Date(),
      authorDisplay: "Joelle P.",
      authorPhotoUrl: "https://t.me/i/userpic/320/joelle.jpg",
      authorIsVip: false,
      masterId: "violetta",
    };
    renderWithIntl(<TestimonialCard testimonial={tm} />);
    const img = screen.getByAltText("Joelle P.") as HTMLImageElement;
    expect(img.src).toContain("joelle.jpg");
  });

  it("returns null when testimonial is null", () => {
    const { container } = renderWithIntl(
      <TestimonialCard testimonial={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
