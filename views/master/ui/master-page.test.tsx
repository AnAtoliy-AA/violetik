import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";

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
  usePathname: () => "/master",
}));

import { MasterPage } from "./master-page";
import type { ApprovedTestimonial } from "@/entities/testimonial";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("MasterPage voices section", () => {
  it("renders the voices section when testimonials are provided", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_1",
      body: "Magic hands.",
      createdAt: new Date(),
      authorDisplay: "Lara K.",
      authorPhotoUrl: null,
      masterId: "violetta",
    };
    renderWithIntl(<MasterPage testimonials={[tm]} />);
    expect(screen.getByText(/Magic hands/)).toBeInTheDocument();
    expect(screen.getByText("Lara K.")).toBeInTheDocument();
  });

  it("renders an <img> avatar when authorPhotoUrl is set", () => {
    const tm: ApprovedTestimonial = {
      id: "tst_2",
      body: "Beautiful chrome finish.",
      createdAt: new Date(),
      authorDisplay: "Iris M.",
      authorPhotoUrl: "https://t.me/i/userpic/320/iris.jpg",
      masterId: "violetta",
    };
    renderWithIntl(<MasterPage testimonials={[tm]} />);
    const img = screen.getByAltText("Iris M.") as HTMLImageElement;
    expect(img.src).toContain("iris.jpg");
  });

  it("omits the voices section entirely when testimonials is empty", () => {
    renderWithIntl(<MasterPage testimonials={[]} />);
    // The voices eyebrow shouldn't render
    expect(screen.queryByText(/Voices/i)).not.toBeInTheDocument();
  });
});

describe("MasterPage photo", () => {
  it("centres the photo, capped at 320px on mobile and 400px on md+", () => {
    const { container } = renderWithIntl(<MasterPage />);
    const frame = container.querySelector('[class*="aspect-"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.className).toMatch(/aspect-\[1\/1\]/);
    expect(frame.parentElement?.className).toMatch(/max-w-\[320px\]/);
    expect(frame.parentElement?.className).toMatch(/md:max-w-\[400px\]/);
    expect(frame.parentElement?.className).toMatch(/mx-auto/);
  });
});
