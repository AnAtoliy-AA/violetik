import { describe, expect, it } from "vitest";
import { onboardingSlideFormSchema } from "./schema";

const good = {
  id: "atelier",
  eyebrowEn: "01 / ATELIER",
  eyebrowRu: "01 / АТЕЛЬЕ",
  eyebrowBy: "01 / АТЭЛЬЕ",
  titleEn: "A studio of one",
  titleRu: "Студия на одного",
  titleBy: "Студыя на аднаго",
  bodyEn: "One chair, one hour.",
  bodyRu: "Одно кресло, один час.",
  bodyBy: "Адно крэсла, адна гадзіна.",
};

describe("onboardingSlideFormSchema", () => {
  it("accepts a valid trilingual slide with no image", () => {
    const r = onboardingSlideFormSchema.safeParse(good);
    expect(r.success).toBe(true);
  });

  it("rejects a missing locale field", () => {
    expect(
      onboardingSlideFormSchema.safeParse({ ...good, titleRu: "" }).success,
    ).toBe(false);
  });

  it("coerces variant and accepts a Blob image", () => {
    const r = onboardingSlideFormSchema.safeParse({
      ...good,
      variant: 2,
      src: "https://abc.public.blob.vercel-storage.com/onboarding/atelier-x.jpg",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.variant).toBe(2);
  });
});
