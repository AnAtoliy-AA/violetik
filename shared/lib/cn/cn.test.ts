import { describe, it, expect } from "vitest";
import { cn } from "./index";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("merges conflicting Tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays and conditional objects (clsx behavior)", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});
