import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceCard } from "./service-card";
import { STUDIO_DATA } from "@/entities/studio";

const sample = STUDIO_DATA.services[0];

describe("ServiceCard", () => {
  it("renders the service name, blurb, duration, and price", () => {
    render(<ServiceCard service={sample} />);
    expect(screen.getByText(sample.name)).toBeInTheDocument();
    expect(screen.getByText(sample.blurb)).toBeInTheDocument();
    expect(screen.getByText(sample.duration)).toBeInTheDocument();
    expect(screen.getByText(`€${sample.price}`)).toBeInTheDocument();
  });

  it("adds the top rule border when topRule is true", () => {
    const { container } = render(
      <ServiceCard service={sample} topRule />,
    );
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
