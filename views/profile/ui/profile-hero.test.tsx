import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
}));

vi.mock("@/db/vip-requests", () => ({
  getCurrentTier: vi.fn(),
}));

vi.mock("@/entities/studio/api/load-with-photos", () => ({
  loadProfileWithPhoto: vi.fn(async () => ({
    name: "Lara K.",
    joined: 2024,
    palette: ["#d9a3b6", "#7d3a6f"] as const,
    avatar: undefined,
  })),
}));

import { getTranslations } from "next-intl/server";
import { getCurrentTier } from "@/db/vip-requests";
import { ProfileHero } from "./profile-hero";

function makeT(messages: Record<string, unknown>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const val = (messages as Record<string, string>)[key] ?? key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      val,
    );
  };
}

function user(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    telegramId: null,
    googleSub: null,
    email: null,
    username: "lara",
    firstName: "Lara",
    lastName: "K.",
    photoUrl: null,
    role: "customer",
    createdAt: new Date("2024-03-15T00:00:00Z"),
    lastSignInAt: null,
    ...over,
  } as never;
}

async function renderHero(opts: { user?: ReturnType<typeof user> } = {}) {
  vi.mocked(getTranslations).mockResolvedValue(makeT(en.Profile) as never);
  const tree = await ProfileHero({ user: opts.user ?? user() });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {tree}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getCurrentTier).mockReset();
  vi.mocked(getCurrentTier).mockResolvedValue({ state: "member" });
});

describe("ProfileHero", () => {
  it("renders VIP pill when current tier is vip", async () => {
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "vip",
      activeRequestId: "vipreq_a",
      expiresAt: new Date("2027-01-01T00:00:00Z"),
    });
    await renderHero();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.queryByText(/Pending VIP/i)).not.toBeInTheDocument();
  });

  it("renders Pending VIP pill when current tier is member-pending", async () => {
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "member-pending",
      pendingRequestId: "vipreq_x",
    });
    await renderHero();
    expect(screen.getByText(/Pending VIP/i)).toBeInTheDocument();
    expect(screen.queryByText(/^VIP$/)).not.toBeInTheDocument();
  });

  it("renders no pill when current tier is member", async () => {
    await renderHero();
    expect(screen.queryByText(/^VIP$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending VIP/i)).not.toBeInTheDocument();
  });

  it("renders the user's display name and joined year", async () => {
    await renderHero();
    expect(
      screen.getByRole("heading", { level: 1, name: /Lara K\./ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Joined in 2024/)).toBeInTheDocument();
  });
});
