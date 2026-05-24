import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceCard } from "./service-card";
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

describe("ServiceCard", () => {
  it("renders the service name, blurb, duration, and displayPrice", () => {
    render(<ServiceCard service={sample} />);
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
    expect(screen.getByText(sample.blurb)).toBeInTheDocument();
    expect(screen.getByText("75 min")).toBeInTheDocument();
    expect(screen.getByText("€95")).toBeInTheDocument();
  });

  it("adds the top rule border when topRule is true", () => {
    const { container } = render(<ServiceCard service={sample} topRule />);
    expect(container.firstChild).toHaveClass("border-t-line-strong");
  });

  it("omits the top rule border by default", () => {
    const { container } = render(<ServiceCard service={sample} />);
    expect(container.firstChild).not.toHaveClass("border-t-line-strong");
  });

  it("merges incoming className with internal layout classes", () => {
    const { container } = render(
      <ServiceCard service={sample} className="opacity-50" />,
    );
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(container.firstChild).toHaveClass("flex");
  });
});
