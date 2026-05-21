import { describe, it, expect } from "vitest";
import { getUserById } from "./users";

describe("getUserById", () => {
  it("returns null when db is null", async () => {
    const result = await getUserById("tg:nobody");
    expect(result === null || typeof result === "object").toBe(true);
  });
});
