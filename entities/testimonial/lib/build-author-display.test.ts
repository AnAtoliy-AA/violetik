import { describe, expect, it } from "vitest";
import { buildAuthorDisplay } from "./build-author-display";

describe("buildAuthorDisplay", () => {
  it("returns firstName + last-initial when both present", () => {
    expect(
      buildAuthorDisplay({
        firstName: "Lara",
        lastName: "Karimova",
        username: "lara_k",
        email: "lara@example.com",
      }),
    ).toBe("Lara K.");
  });

  it("returns firstName alone when no lastName", () => {
    expect(
      buildAuthorDisplay({
        firstName: "Lara",
        lastName: null,
        username: null,
        email: null,
      }),
    ).toBe("Lara");
  });

  it("falls back to username when no first/last name", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: "lara_k",
        email: null,
      }),
    ).toBe("lara_k");
  });

  it("falls back to a 2-char email head + ellipsis when no name/username", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: null,
        email: "ali@gmail.com",
      }),
    ).toBe("al…");
  });

  it("returns short email head as-is when it's <= 2 chars", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: null,
        email: "a@x.com",
      }),
    ).toBe("a");
  });

  it("falls back to 'Guest' when every field is null", () => {
    expect(
      buildAuthorDisplay({
        firstName: null,
        lastName: null,
        username: null,
        email: null,
      }),
    ).toBe("Guest");
  });
});
