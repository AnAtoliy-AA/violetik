import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "tg:1" } })),
}));
vi.mock("@/db/google-tokens", () => ({
  upsertGoogleToken: vi.fn(async () => ({ userId: "tg:1" })),
}));

import { GET } from "./route";
import { upsertGoogleToken } from "@/db/google-tokens";

function req(url: string, cookie: string): Request {
  return new Request(url, { headers: { cookie } });
}

describe("GET /api/integrations/google/callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      "https://x.test/api/integrations/google/callback";
  });

  it("400s when the state cookie doesn't match the query param", async () => {
    const res = await GET(
      req(
        "https://x.test/api/integrations/google/callback?code=abc&state=BAD",
        "gcal_oauth_state=GOOD",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("exchanges the code, upserts the token, and redirects", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "ya29.x",
            refresh_token: "1//y",
            expires_in: 3599,
            scope: "openid email",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ email: "v@example.com" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const res = await GET(
      req(
        "https://x.test/api/integrations/google/callback?code=abc&state=OK",
        "gcal_oauth_state=OK",
      ),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/integrations/google");
    expect(upsertGoogleToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "tg:1",
        refreshToken: "1//y",
        email: "v@example.com",
      }),
    );
  });
});
