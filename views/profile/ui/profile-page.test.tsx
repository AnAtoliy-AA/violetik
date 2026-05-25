import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
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
  usePathname: () => "/profile",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
}));

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { ProfilePage } from "./profile-page";

function makeT(messages: Record<string, unknown>) {
  function t(key: string, params?: Record<string, string | number>): string {
    const val = (messages as Record<string, string>)[key] ?? key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      val,
    );
  }
  return t;
}

async function renderPage(locale = "en") {
  const t = makeT(en.Profile);
  const tLinks = makeT(en.Profile.quick_links);
  vi.mocked(getTranslations).mockImplementation(async (ns: unknown) => {
    if (ns === "Profile.quick_links") return tLinks as never;
    return t as never;
  });
  const page = await ProfilePage({ locale });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {page}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getCurrentSessionUser).mockReset();
  vi.mocked(redirect).mockClear();

  vi.mocked(getCurrentSessionUser).mockResolvedValue({
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
  } as never);
});

describe("ProfilePage (shell)", () => {
  // The page is a thin shell: it does an auth check, renders the static
  // chrome (header, quick links nav, tab bar), and wraps each data-
  // dependent block in <Suspense fallback={<Skeleton />}>. The individual
  // skeleton-then-data flows are tested per sub-component (profile-hero,
  // upcoming-bookings, booking-history, testimonials-section). Here we
  // only verify the shell concerns that don't depend on suspended data:
  // auth redirect, the quick-links nav, and that each Suspense boundary
  // shows its skeleton when no data has resolved yet. React's client
  // renderer (used by jsdom) can't actually run async server components,
  // so in this test environment the skeletons are what renders.

  it("renders the quick-links nav with all entries", async () => {
    await renderPage();
    const nav = screen.getByRole("navigation", { name: /Account links/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(
      within(nav).getByRole("link", { name: /My bookings/i }),
    ).toHaveAttribute("href", "/booking/service");
    expect(
      within(nav).getByRole("link", { name: /Member card/i }),
    ).toHaveAttribute("href", "/membership");
    expect(
      within(nav).getByRole("link", { name: /Notifications/i }),
    ).toHaveAttribute("href", "/profile/notifications");
  });

  it("renders a skeleton fallback for every suspended section", async () => {
    await renderPage();
    expect(screen.getByLabelText(/Loading profile/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Loading upcoming visits/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Loading visit history/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Loading testimonials/i),
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated visitors to the sign-in page", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await expect(renderPage("en")).rejects.toThrow(
      "REDIRECT:/en/sign-in?callbackUrl=/en/profile",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/en/sign-in?callbackUrl=/en/profile",
    );
  });
});
