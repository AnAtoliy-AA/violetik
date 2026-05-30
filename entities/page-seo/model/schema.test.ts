import { describe, expect, it } from "vitest";
import { pageSeoPatchSchema } from "./schema";

const validEntry = {
  id: "home",
  titleEn: "Home",
  titleRu: "Главная",
  titleBy: "Галоўная",
  descriptionEn: "Welcome",
  descriptionRu: "Добро пожаловать",
  descriptionBy: "Сардэчна запрашаем",
};

describe("pageSeoPatchSchema", () => {
  it("accepts a well-formed patch", () => {
    const result = pageSeoPatchSchema.safeParse({ entries: [validEntry] });
    expect(result.success).toBe(true);
  });

  it("accepts an empty entries array (nothing to change)", () => {
    expect(pageSeoPatchSchema.safeParse({ entries: [] }).success).toBe(true);
  });

  it("accepts blank override fields", () => {
    const result = pageSeoPatchSchema.safeParse({
      entries: [{ ...validEntry, titleEn: "", descriptionEn: "" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown page id", () => {
    const result = pageSeoPatchSchema.safeParse({
      entries: [{ ...validEntry, id: "not-a-page" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long title", () => {
    const result = pageSeoPatchSchema.safeParse({
      entries: [{ ...validEntry, titleEn: "x".repeat(71) }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long description", () => {
    const result = pageSeoPatchSchema.safeParse({
      entries: [{ ...validEntry, descriptionEn: "x".repeat(201) }],
    });
    expect(result.success).toBe(false);
  });
});
