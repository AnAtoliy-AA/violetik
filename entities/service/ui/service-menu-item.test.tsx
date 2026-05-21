import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceMenuItem } from "./service-menu-item";
import type { Service } from "../model/types";

const sample: Service = {
  id: "signature",
  category: { id: "care", name: "Care" },
  name: "Signature Manicure",
  blurb:
    "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
  includes: [],
  price: 95,
  priceCents: 9500,
  displayPrice: "€95",
  duration: "75 min",
  durationMinutes: 75,
  sortOrder: 1,
};

describe("ServiceMenuItem", () => {
  it("renders the service name, duration, category, blurb, and price", () => {
    render(<ServiceMenuItem service={sample} plateNumber={1} />);
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
    expect(screen.getByText(/75 min.*Care/)).toBeInTheDocument();
    expect(screen.getByText(sample.blurb)).toBeInTheDocument();
    expect(screen.getByText("€95")).toBeInTheDocument();
  });

  it("zero-pads the plate number to two digits", () => {
    const { rerender } = render(
      <ServiceMenuItem service={sample} plateNumber={2} />,
    );
    expect(screen.getByText("02")).toBeInTheDocument();
    rerender(<ServiceMenuItem service={sample} plateNumber={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("opts into a top rule via the topRule prop", () => {
    const { container } = render(
      <ServiceMenuItem service={sample} plateNumber={1} topRule />,
    );
    expect(container.firstChild).toHaveClass("border-t-[0.5px]");
  });
});
