import { describe, expect, it } from "vitest";
import { pickLocalizedName } from "./pick-localized-name";

const row = { nameEn: "Care", nameRu: "Уход", nameBy: "Догляд" };

describe("pickLocalizedName", () => {
  it("returns the English name for the en locale", () => {
    expect(pickLocalizedName(row, "en")).toBe("Care");
  });

  it("returns the Russian name for the ru locale", () => {
    expect(pickLocalizedName(row, "ru")).toBe("Уход");
  });

  it("returns the Belarusian name for the by locale", () => {
    expect(pickLocalizedName(row, "by")).toBe("Догляд");
  });
});
