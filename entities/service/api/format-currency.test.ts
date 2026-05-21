import { describe, expect, it } from "vitest";
import { formatMajorAmount } from "./format-currency";

describe("formatMajorAmount", () => {
  it("formats EUR for en with a leading symbol and no fraction digits", () => {
    expect(formatMajorAmount({ amountCents: 9500, currency: "EUR", locale: "en" }))
      .toBe("€95");
  });

  it("formats USD for en with a leading $ sign", () => {
    expect(formatMajorAmount({ amountCents: 9500, currency: "USD", locale: "en" }))
      .toBe("$95");
  });

  it("formats BYN for be — trailing symbol", () => {
    const result = formatMajorAmount({
      amountCents: 9500,
      currency: "BYN",
      locale: "be",
    });
    expect(result).toMatch(/95[\s  ]*Br/);
  });

  it("formats RUB for ru — trailing ruble sign", () => {
    const result = formatMajorAmount({
      amountCents: 9500,
      currency: "RUB",
      locale: "ru",
    });
    expect(result).toMatch(/95[\s  ]*₽/);
  });

  it("rounds half-cents up — 9550 cents → €96 in EUR/en with max 0 fraction", () => {
    expect(formatMajorAmount({ amountCents: 9550, currency: "EUR", locale: "en" }))
      .toBe("€96");
  });

  it("returns '€0' for zero amount in EUR/en", () => {
    expect(formatMajorAmount({ amountCents: 0, currency: "EUR", locale: "en" }))
      .toBe("€0");
  });
});
