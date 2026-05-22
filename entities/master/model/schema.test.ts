import { describe, expect, it } from "vitest";
import { masterFormSchema } from "./schema";

const valid = {
  id: "violetta",
  nameEn: "Violetta",
  nameRu: "Виолетта",
  nameBe: "Віялета",
  roleEn: "Master",
  roleRu: "Мастер",
  roleBe: "Майстра",
  bioEn: "EN bio",
  bioRu: "RU bio",
  bioBe: "BE bio",
  quoteEn: "EN quote",
  quoteRu: "RU quote",
  quoteBe: "BE quote",
  years: 11,
  sortOrder: 0,
  status: "published" as const,
  serviceIds: ["signature", "gel"],
};

describe("masterFormSchema", () => {
  it("accepts a well-formed master", () => {
    expect(masterFormSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects blank nameRu with 'required'", () => {
    const res = masterFormSchema.safeParse({ ...valid, nameRu: "" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe("required");
    }
  });
  it("rejects an invalid slug", () => {
    const res = masterFormSchema.safeParse({ ...valid, id: "Violetta!" });
    expect(res.success).toBe(false);
  });
  it("rejects years > 80", () => {
    expect(masterFormSchema.safeParse({ ...valid, years: 81 }).success).toBe(
      false,
    );
  });
});
