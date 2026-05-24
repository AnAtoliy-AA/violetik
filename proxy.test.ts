import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

// vi.mock is hoisted above imports, so any spy defined at module scope
// is `undefined` when the factory runs. vi.hoisted lifts the spies so
// they exist before the factory + the test body reference them.
const mocks = vi.hoisted(() => ({
  createMiddleware: vi.fn(() => vi.fn(() => new Response())),
  getCachedDefaultLocale: vi.fn<() => Promise<"en" | "ru" | "by">>(),
}));

vi.mock("next-intl/middleware", () => ({ default: mocks.createMiddleware }));
vi.mock("@/shared/lib/site-settings-cache", () => ({
  getCachedDefaultLocale: mocks.getCachedDefaultLocale,
  invalidateDefaultLocaleCache: vi.fn(),
}));

function fakeReq(
  url = "http://localhost/",
  cookieValue?: string,
): NextRequest {
  const store = new Map<string, { value: string }>();
  if (cookieValue) store.set("NEXT_LOCALE", { value: cookieValue });
  return {
    url,
    nextUrl: new URL(url),
    cookies: {
      get: (k: string) => store.get(k),
      set: (k: string, v: string) => {
        store.set(k, { value: v });
      },
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

  it("redirects /be/* to /by/* with 308 preserving the query string", async () => {
    mocks.getCachedDefaultLocale.mockResolvedValue("en");
    const proxy = (await import("./proxy")).default;
    const res = await proxy(fakeReq("https://x.test/be/home?foo=bar"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://x.test/by/home?foo=bar");
  });

  it("redirects bare /be (no trailing slash) to /by", async () => {
    mocks.getCachedDefaultLocale.mockResolvedValue("en");
    const proxy = (await import("./proxy")).default;
    const res = await proxy(fakeReq("https://x.test/be"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://x.test/by");
  });

  it("rewrites NEXT_LOCALE=be cookie on the incoming request", async () => {
    mocks.getCachedDefaultLocale.mockResolvedValue("en");
    const proxy = (await import("./proxy")).default;
    const req = fakeReq("https://x.test/", "be");
    await proxy(req);
    expect(req.cookies.get("NEXT_LOCALE")?.value).toBe("by");
  });
});
