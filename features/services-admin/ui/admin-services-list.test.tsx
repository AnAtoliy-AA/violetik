import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AdminServicesList } from "./admin-services-list";
import type { Service, ServiceCategoryRow } from "@/db/schema";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const categories: ServiceCategoryRow[] = [
  {
    id: "care",
    nameEn: "Care",
    nameRu: "Уход",
    nameBy: "Догляд",
    sortOrder: 1,
    status: "published",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    updatedBy: null,
  },
];

const services: Service[] = [
  {
    id: "signature",
    categoryId: "care",
    nameEn: "Signature Manicure",
    nameRu: "Сигнатурный маникюр",
    nameBy: "Сігнатурны манікюр",
    blurbEn: "EN",
    blurbRu: "RU",
    blurbBy: "BE",
    includes: [],
    priceCents: 9500,
    durationMinutes: 75,
    sortOrder: 1,
    status: "published",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    updatedBy: null,
  },
];

describe("AdminServicesList", () => {
  it("renders Categories and Services section headers", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdminServicesList
          categories={categories}
          services={services}
          reorderCategoriesAction={vi.fn()}
          reorderServicesAction={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: /Categories/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Services/ }),
    ).toBeInTheDocument();
  });

  it("renders an Edit link per category and per service", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdminServicesList
          categories={categories}
          services={services}
          reorderCategoriesAction={vi.fn()}
          reorderServicesAction={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    const editLinks = screen.getAllByRole("link", { name: /Edit/ });
    expect(editLinks.length).toBe(2);
  });

  it("renders English category and service names", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdminServicesList
          categories={categories}
          services={services}
          reorderCategoriesAction={vi.fn()}
          reorderServicesAction={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Care")).toBeInTheDocument();
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
  });

  it("renders category and service names in the active locale", () => {
    render(
      <NextIntlClientProvider locale="ru" messages={en}>
        <AdminServicesList
          categories={categories}
          services={services}
          reorderCategoriesAction={vi.fn()}
          reorderServicesAction={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Уход")).toBeInTheDocument();
    expect(screen.getByText("Сигнатурный маникюр")).toBeInTheDocument();
    expect(screen.queryByText("Care")).not.toBeInTheDocument();
  });
});
