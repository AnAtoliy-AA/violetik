import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

// vi.mock is hoisted above imports, so any spy defined at module scope
// is `undefined` when the factory runs. vi.hoisted lifts the spies so
// they exist before the factory + the test body reference them.
const mocks = vi.hoisted(() => ({
  createMiddleware: vi.fn(() => vi.fn(() => new Response())),
  getCachedDefaultLocale: vi.fn<() => Promise<"en" | "ru" | "be">>(),
}));

vi.mock("next-intl/middleware", () => ({ default: mocks.createMiddleware }));
vi.mock("@/shared/lib/site-settings-cache", () => ({
  getCachedDefaultLocale: mocks.getCachedDefaultLocale,
  invalidateDefaultLocaleCache: vi.fn(),
}));

function fakeReq(url = "http://localhost/"): NextRequest {
  return {
    url,
    nextUrl: new URL(url),
    cookies: {
      get: () => undefined,
      set: vi.fn(),
    },
  } as unknown as NextRequest;
}

describe("proxy", () => {
  beforeEach(() => {
    mocks.createMiddleware.mockClear();
    mocks.getCachedDefaultLocale.mockReset();
  });

  it("forwards the admin-chosen default locale to next-intl", async () => {
    mocks.getCachedDefaultLocale.mockResolvedValue("en");
    const proxy = (await import("./proxy")).default;
    await proxy(fakeReq());
    expect(mocks.createMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLocale: "en" }),
    );
  });

  it("flows a different cached default through unchanged", async () => {
    mocks.getCachedDefaultLocale.mockResolvedValue("ru");
    const proxy = (await import("./proxy")).default;
    await proxy(fakeReq());
    expect(mocks.createMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLocale: "ru" }),
    );
  });
});
