import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAuthUrl, exchangeCode, refreshAccessToken } from "./oauth";

describe("buildAuthUrl", () => {
  it("includes all required Google OAuth params", () => {
    const url = new URL(
      buildAuthUrl({
        clientId: "abc.apps.googleusercontent.com",
        redirectUri: "https://x.test/cb",
        state: "csrf123",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe(
      "abc.apps.googleusercontent.com",
    );
    expect(url.searchParams.get("redirect_uri")).toBe("https://x.test/cb");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("csrf123");
    expect(url.searchParams.get("scope")).toContain("calendar.events");
    expect(url.searchParams.get("scope")).toContain("email");
  });
});

describe("exchangeCode", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs to the token endpoint and returns parsed tokens", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "ya29.x",
          refresh_token: "1//y",
          expires_in: 3599,
          scope: "openid email",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await exchangeCode({
      clientId: "id",
      clientSecret: "sec",
      code: "abc",
      redirectUri: "https://x.test/cb",
    });
    expect(result).toEqual({
      accessToken: "ya29.x",
      refreshToken: "1//y",
      expiresIn: 3599,
      scope: "openid email",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(String(calledUrl)).toBe("https://oauth2.googleapis.com/token");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("throws when the token endpoint returns non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("invalid_grant", { status: 400 }),
    );
    await expect(
      exchangeCode({
        clientId: "id",
        clientSecret: "sec",
        code: "bad",
        redirectUri: "x",
      }),
    ).rejects.toThrow(/exchange.*400/);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a fresh access token", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "ya29.fresh",
          expires_in: 3599,
          scope: "openid email",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await refreshAccessToken({
      clientId: "id",
      clientSecret: "sec",
      refreshToken: "1//y",
    });
    expect(result.accessToken).toBe("ya29.fresh");
    expect(result.expiresIn).toBe(3599);
  });
});
