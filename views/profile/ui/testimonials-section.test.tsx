import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/db/testimonials", () => ({
  listUserTestimonials: vi.fn(async () => []),
  createTestimonial: vi.fn(),
}));

vi.mock("@/db/masters", () => ({
  listPublishedMasters: vi.fn(async () => [
    {
      id: "m1",
      nameEn: "Violetta",
      nameRu: "Виолетта",
      nameBy: "Віалета",
      roleEn: "",
      roleRu: "",
      roleBy: "",
      bioEn: "",
      bioRu: "",
      bioBy: "",
      quoteEn: "",
      quoteRu: "",
      quoteBy: "",
      years: 10,
      setsLabel: "",
      telegramUsername: "violetta",
      sortOrder: 0,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as never,
  ]),
  getMasterById: vi.fn(),
}));

vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/shared/lib/google-calendar", () => ({
  deleteCalendarEvent: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { TestimonialsSection } from "./testimonials-section";

async function renderTestimonials(locale = "en") {
  const tree = await TestimonialsSection({ userId: "u1", locale });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {tree}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TestimonialsSection", () => {
  it("renders the testimonial form and the empty 'my testimonials' state", async () => {
    await renderTestimonials();
    expect(
      screen.getByRole("button", { name: /^Submit$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Share a few words about a master\./i),
    ).toBeInTheDocument();
  });
});
