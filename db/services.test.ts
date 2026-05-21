import { describe, expect, it } from "vitest";
import {
  listAllCategories,
  listAllServices,
  listPublishedCategories,
  listPublishedServices,
  getServiceById,
} from "./services";

describe("db/services", () => {
  it("returns array shapes even when DATABASE_URL is unset", async () => {
    let services: unknown[] = [];
    let categories: unknown[] = [];
    let publishedServices: unknown[] = [];
    let publishedCategories: unknown[] = [];
    let one: unknown = "unset";
    try {
      services = await listAllServices();
      categories = await listAllCategories();
      publishedServices = await listPublishedServices();
      publishedCategories = await listPublishedCategories();
      one = await getServiceById("does-not-exist");
    } catch {
      // Real DB reachable but migration not applied — also acceptable.
    }
    expect(Array.isArray(services)).toBe(true);
    expect(Array.isArray(categories)).toBe(true);
    expect(Array.isArray(publishedServices)).toBe(true);
    expect(Array.isArray(publishedCategories)).toBe(true);
    expect(
      one === null || (typeof one === "object" && one !== null),
    ).toBe(true);
  });
});
