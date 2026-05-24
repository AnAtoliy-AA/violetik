import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/membership",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
  getLocale: vi.fn(),
}));

vi.mock("@/db/vip-requests", () => ({
  getCurrentTier: vi.fn(),
}));

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/features/vip-request-submit/api/actions", () => ({
  submitVipRequest: vi.fn(),
  cancelVipRequest: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/lib/site-settings-server", () => ({
  getSiteSettingsServer: vi.fn(),
}));

import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { MembershipPage } from "./membership-page";

function makeT(messages: Record<string, unknown>) {
  function t(key: string, params?: Record<string, string>): string {
    const val = (messages as Record<string, string>)[key] ?? key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, v),
      val,
    );
  }
  t.rich = (key: string, tags: Record<string, (c: unknown) => unknown>) => {
    const val = (messages as Record<string, string>)[key] ?? key;
    return val.replace(/<(\w+)>(.*?)<\/\1>/g, (_: string, tag: string, content: string) => {
      const fn = tags[tag];
      return fn ? String(fn(content)) : content;
    });
  };
  return t;
}

async function renderPage() {
  const t = makeT(en.Membership);
  vi.mocked(getTranslations).mockResolvedValue(t as never);
  vi.mocked(getLocale).mockResolvedValue("en");
  const page = await MembershipPage();
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {page}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getCurrentSessionUser).mockReset();
  vi.mocked(getCurrentTier).mockReset();
  vi.mocked(getSiteSettingsServer).mockResolvedValue(DEFAULT_SITE_SETTINGS);
});

describe("MembershipPage", () => {
  it("renders two tier cards in canonical order", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(within(articles[0]).getByText("Member")).toBeInTheDocument();
    expect(within(articles[1]).getByText("VIP")).toBeInTheDocument();
  });

  it("marks the VIP tier as featured with the Most chosen tag", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    expect(screen.getByText(/Most chosen/i)).toBeInTheDocument();
  });

  it("shows monthly prices by default and switches to annual ×10", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    const vipArticle = screen.getAllByRole("article")[1];
    expect(within(vipArticle).getByText("€180")).toBeInTheDocument();
    expect(within(vipArticle).getByText("/ month")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Annual/i }));
    expect(within(vipArticle).getByText("€1800")).toBeInTheDocument();
    expect(within(vipArticle).getByText("/ year")).toBeInTheDocument();
  });

  it("free tier renders Free instead of a price and a Stay free CTA", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    const memberCard = screen.getAllByRole("article")[0];
    expect(within(memberCard).getByText(/^Free$/)).toBeInTheDocument();
    expect(
      within(memberCard).getByRole("link", { name: /Stay free/i }),
    ).toBeInTheDocument();
  });

  describe("VIP CTA states", () => {
    it("visitor — VIP card shows sign-in link", async () => {
      vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
      await renderPage();
      const vipCard = screen.getAllByRole("article")[1];
      expect(
        within(vipCard).getByRole("link", { name: /Sign in to apply/i }),
      ).toBeInTheDocument();
    });

    it("member — VIP card shows Join VIP button", async () => {
      vi.mocked(getCurrentSessionUser).mockResolvedValue({
        id: "u1",
      } as never);
      vi.mocked(getCurrentTier).mockResolvedValue({ state: "member" });
      await renderPage();
      const vipCard = screen.getAllByRole("article")[1];
      expect(
        within(vipCard).getByRole("button", { name: /Join VIP/i }),
      ).toBeInTheDocument();
    });

    it("pending — VIP card shows Cancel request button", async () => {
      vi.mocked(getCurrentSessionUser).mockResolvedValue({
        id: "u1",
      } as never);
      vi.mocked(getCurrentTier).mockResolvedValue({
        state: "member-pending",
        pendingRequestId: "vipreq_x",
      });
      await renderPage();
      const vipCard = screen.getAllByRole("article")[1];
      expect(
        within(vipCard).getByRole("button", { name: /Cancel request/i }),
      ).toBeInTheDocument();
    });

    it("vip — VIP card shows You're a VIP label", async () => {
      vi.mocked(getCurrentSessionUser).mockResolvedValue({
        id: "u1",
      } as never);
      vi.mocked(getCurrentTier).mockResolvedValue({
        state: "vip",
        activeRequestId: "vipreq_a",
        expiresAt: new Date("2027-01-01T00:00:00Z"),
      });
      await renderPage();
      const vipCard = screen.getAllByRole("article")[1];
      expect(
        within(vipCard).getByText(/You're a VIP/i),
      ).toBeInTheDocument();
    });
  });

  describe("site settings overrides + discount", () => {
    it("respects a VIP price override (monthly view)", async () => {
      vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
      vi.mocked(getSiteSettingsServer).mockResolvedValue({
        ...DEFAULT_SITE_SETTINGS,
        priceOverrides: { "membership:VIP": 200 },
      });
      await renderPage();
      const vipCard = screen.getAllByRole("article")[1];
      expect(within(vipCard).getByText("€200")).toBeInTheDocument();
    });

    it("annual view multiplies the override by 10", async () => {
      const user = userEvent.setup();
      vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
      vi.mocked(getSiteSettingsServer).mockResolvedValue({
        ...DEFAULT_SITE_SETTINGS,
        priceOverrides: { "membership:VIP": 200 },
      });
      await renderPage();
      await user.click(screen.getByRole("tab", { name: /Annual/i }));
      const vipCard = screen.getAllByRole("article")[1];
      expect(within(vipCard).getByText("€2000")).toBeInTheDocument();
    });

    it("renders struck base alongside discounted effective when discount is active", async () => {
      vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
      vi.mocked(getSiteSettingsServer).mockResolvedValue({
        ...DEFAULT_SITE_SETTINGS,
        priceOverrides: { "membership:VIP": 200 },
        discountPercent: 10,
        discountActive: true,
      });
      await renderPage();
      const vipCard = screen.getAllByRole("article")[1];
      // 200 * 0.9 = 180
      expect(within(vipCard).getByText("€180")).toBeInTheDocument();
      expect(within(vipCard).getByText("€200").tagName).toBe("S");
    });
  });
});
