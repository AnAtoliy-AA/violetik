import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Price } from "./price";

describe("Price", () => {
  it("renders only the effective price when there's no discount (EUR/en)", () => {
    render(
      <Price
        resolved={{ base: 95, effective: 95, hasDiscount: false }}
        currency="EUR"
        locale="en"
      />,
    );
    expect(screen.getByText("€95")).toBeInTheDocument();
    expect(screen.queryByText("€95", { selector: "s" })).toBeNull();
  });

  it("renders the struck base price beside the discounted effective price (EUR/en)", () => {
    render(
      <Price
        resolved={{ base: 100, effective: 80, hasDiscount: true }}
        currency="EUR"
        locale="en"
      />,
    );
    expect(screen.getByText("€80")).toBeInTheDocument();
    const struck = screen.getByText("€100");
    expect(struck.tagName).toBe("S");
  });

  it("renders the free label when effective is 0", () => {
    render(
      <Price
        resolved={{ base: 0, effective: 0, hasDiscount: false }}
        currency="EUR"
        locale="en"
        freeLabel="Free"
      />,
    );
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("formats RUB / ru as a trailing ₽", () => {
    render(
      <Price
        resolved={{ base: 95, effective: 95, hasDiscount: false }}
        currency="RUB"
        locale="ru"
      />,
    );
    expect(screen.getByText(/95[\s  ]*₽/)).toBeInTheDocument();
  });
});
