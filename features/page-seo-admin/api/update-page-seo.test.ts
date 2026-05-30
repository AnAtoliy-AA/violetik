import { describe, it, expect, vi, beforeEach } from "vitest";

let requireAdmin: ReturnType<typeof vi.fn>;

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let updatePageSeo: ReturnType<typeof vi.fn>;

vi.mock("@/db/page-seo", () => ({
  updatePageSeo: (...args: unknown[]) => updatePageSeo(...args),
}));

beforeEach(() => {
  vi.resetAllMocks();
  updatePageSeo = vi.fn();
  // The admin gate only runs when TELEGRAM_BOT_TOKEN is set (it is, via
  // .env.local). Grant access by default so each test exercises the
  // validate → persist → revalidate path; failure cases override below.
  requireAdmin = vi.fn().mockResolvedValue({ ok: true, user: { id: "admin-1" } });
});

// Dynamic import after mocks are set up so the action picks up mocked deps.
let mod: typeof import("./update-page-seo");

beforeEach(async () => {
  mod = await import("./update-page-seo");
});

const validPatch = {
  entries: [
    {
      id: "home",
      titleEn: "Home",
      titleRu: "",
      titleBy: "",
      headingEn: "",
      headingRu: "",
      headingBy: "",
      descriptionEn: "",
      descriptionRu: "",
      descriptionBy: "",
    },
  ],
};

describe("updatePageSeoAction", () => {
  it("persists and reports success on a valid patch", async () => {
    updatePageSeo.mockResolvedValue(undefined);
    const result = await mod.updatePageSeoAction(validPatch);
    expect(result).toEqual({ ok: true });
    expect(updatePageSeo).toHaveBeenCalledOnce();
  });

  it("returns a validation error instead of throwing on a bad patch", async () => {
    const result = await mod.updatePageSeoAction({ entries: [{ id: "nope" }] });
    expect(result.ok).toBe(false);
    expect(updatePageSeo).not.toHaveBeenCalled();
  });

  it("returns an error (not a 500) when the DB write fails", async () => {
    // Reproduces the production bug: page_seo table missing => INSERT throws.
    // The action must catch and surface, never let the exception escape.
    updatePageSeo.mockRejectedValue(
      new Error('relation "page_seo" does not exist'),
    );
    const result = await mod.updatePageSeoAction(validPatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("page_seo");
    }
  });
});
