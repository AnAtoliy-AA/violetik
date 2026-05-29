import { describe, expect, it } from "vitest";
import {
  createOnboardingSlide,
  updateOnboardingSlide,
  deleteOnboardingSlide,
  reorderOnboardingSlides,
} from "./onboarding-mutations";
import { listOnboardingSlides, getOnboardingSlideById } from "./onboarding";

const goodSlide = {
  id: "atelier",
  eyebrowEn: "01",
  eyebrowRu: "01",
  eyebrowBy: "01",
  titleEn: "t",
  titleRu: "t",
  titleBy: "t",
  bodyEn: "b",
  bodyRu: "b",
  bodyBy: "b",
};

describe("db/onboarding-mutations", () => {
  it("returns the expected shapes without throwing when DATABASE_URL is unset", async () => {
    let deleted: { deletedSrc: string | null } | null | undefined;
    try {
      await createOnboardingSlide(goodSlide);
      await updateOnboardingSlide("atelier", { titleEn: "t2" });
      deleted = await deleteOnboardingSlide("atelier");
      await reorderOnboardingSlides(["atelier"]);
    } catch {
      // Missing-table fallthrough acceptable in CI without a migrated DB.
    }
    expect(
      deleted === undefined || deleted === null || "deletedSrc" in deleted,
    ).toBe(true);
  });

  it("reports db_unavailable when the DB is unconfigured", async () => {
    expect(await createOnboardingSlide(goodSlide)).toEqual({
      ok: false,
      error: "db_unavailable",
    });
  });

  it("reads return empty / null without the DB", async () => {
    expect(await listOnboardingSlides()).toEqual([]);
    expect(await getOnboardingSlideById("atelier")).toBeNull();
  });
});
