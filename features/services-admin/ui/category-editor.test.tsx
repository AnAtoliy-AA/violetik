import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CategoryEditor } from "./category-editor";

function makeInitial() {
  return {
    id: "care",
    nameEn: "Care",
    nameRu: "Уход",
    nameBe: "Догляд",
    sortOrder: 1,
    status: "published" as const,
  };
}

function setup(mode: "create" | "edit", initial = makeInitial()) {
  const onSubmit = vi.fn(async () => ({ ok: true as const }));
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CategoryEditor mode={mode} initial={initial} onSubmit={onSubmit} />
    </NextIntlClientProvider>,
  );
  return { onSubmit };
}

describe("CategoryEditor", () => {
  it("freezes the slug input on edit", () => {
    setup("edit");
    expect(screen.getByLabelText(/^Slug$/)).toBeDisabled();
  });

  it("leaves the slug input editable on create", () => {
    setup("create", {
      id: "",
      nameEn: "",
      nameRu: "",
      nameBe: "",
      sortOrder: 0,
      status: "published",
    });
    expect(screen.getByLabelText(/^Slug$/)).not.toBeDisabled();
  });

  it("rejects submission when a locale name is empty", async () => {
    const { onSubmit } = setup("edit");
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Name \(Belarusian\)/));
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Required/)).toBeInTheDocument();
  });

  it("forwards the payload when valid", async () => {
    const { onSubmit } = setup("edit");
    await userEvent.setup().click(screen.getByRole("button", { name: /^Save$/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "care",
        nameEn: "Care",
        nameRu: "Уход",
        nameBe: "Догляд",
        status: "published",
      }),
    );
  });
});
