import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/site-settings", () => ({
  updateSiteSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    ok: true,
    user: { id: "tg:1" },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/shared/lib/site-settings-cache", () => ({
  invalidateDefaultLocaleCache: vi.fn(),
}));

import { updateSiteSettings } from "@/db/site-settings";
import { requireAdmin } from "@/shared/lib/auth-server";
import { revalidatePath } from "next/cache";
import { invalidateDefaultLocaleCache } from "@/shared/lib/site-settings-cache";
import { updateStudioAction } from "./update-studio";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
});

describe("updateStudioAction", () => {
  it("persists a valid patch and revalidates the layout", async () => {
    const result = await updateStudioAction({
      addressEn: "12 Rose",
      country: "BY",
      cityEn: "Borisov",
      timezone: "Europe/Minsk",
      latitude: 54.231,
      longitude: 28.491,
      mapVisible: true,
    });
    expect(result).toEqual({ ok: true });
    expect(updateSiteSettings).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(invalidateDefaultLocaleCache).toHaveBeenCalledOnce();
  });

  it("rejects an invalid patch", async () => {
    const result = await updateStudioAction({ latitude: 999 });
    expect(result.ok).toBe(false);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("rejects an invalid Telegram username", async () => {
    const result = await updateStudioAction({ telegramUsername: "bad!" });
    expect(result.ok).toBe(false);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("refuses non-admin callers when auth is required", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      ok: false,
      reason: "forbidden",
    });
    const result = await updateStudioAction({ cityEn: "X" });
    expect(result.ok).toBe(false);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("skips the auth gate when TELEGRAM_BOT_TOKEN is unset (CI/dev)", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const result = await updateStudioAction({ cityEn: "Borisov" });
    expect(result).toEqual({ ok: true });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(updateSiteSettings).toHaveBeenCalled();
  });
});
