import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceMenuItem } from "./service-menu-item";
import { STUDIO_DATA } from "@/entities/studio";

const sample = STUDIO_DATA.services[0];

describe("ServiceMenuItem", () => {
  it("renders the service name, duration, category, blurb, and price", () => {
    render(<ServiceMenuItem service={sample} plateNumber={1} />);
    expect(screen.getByText(sample.name)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${sample.duration}.*${sample.category}`)),
    ).toBeInTheDocument();
    expect(screen.getByText(sample.blurb)).toBeInTheDocument();
    expect(screen.getByText(`€${sample.price}`)).toBeInTheDocument();
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
