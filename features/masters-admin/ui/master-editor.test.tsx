import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { MasterEditor } from "./master-editor";

const services = [
  {
    id: "signature",
    name: "Signature",
    categoryId: "care",
    categoryName: "Care",
  },
  { id: "gel", name: "Gel", categoryId: "gel", categoryName: "Gel" },
];

function makeInitial() {
  return {
    id: "violetta",
    nameEn: "Violetta",
    nameRu: "Виолетта",
    nameBe: "Віялета",
    roleEn: "Master",
    roleRu: "Мастер",
    roleBe: "Майстра",
    bioEn: "EN bio",
    bioRu: "RU bio",
    bioBe: "BE bio",
    quoteEn: "EN quote",
    quoteRu: "RU quote",
    quoteBe: "BE quote",
    years: 11,
    setsLabel: "600+",
    sortOrder: 0,
    status: "published" as const,
    serviceIds: ["signature"],
  };
}

function setup(mode: "create" | "edit", initial = makeInitial()) {
  const onSubmit = vi.fn(async () => ({ ok: true as const }));
  const result = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MasterEditor
        mode={mode}
        initial={initial}
        services={services}
        onSubmit={onSubmit}
      />
    </NextIntlClientProvider>,
  );
  return { onSubmit, container: result.container };
}

describe("MasterEditor", () => {
  it("freezes the slug input on edit", () => {
    setup("edit");
    expect(screen.getByLabelText(/^Slug$/)).toBeDisabled();
  });

  it("rejects an empty RU bio with an inline 'Required' error", async () => {
    const { onSubmit } = setup("edit");
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Bio \(Russian\)/));
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Required/).length).toBeGreaterThan(0);
  });

  // Regression for PR #46: photoSlot must not nest inside the editor's <form>.
  it("renders photoSlot outside the editor's <form>", () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MasterEditor
          mode="edit"
          initial={makeInitial()}
          services={services}
          onSubmit={onSubmit}
          photoSlot={<form data-testid="photo-form" />}
        />
      </NextIntlClientProvider>,
    );
    const editorForm = container.querySelector(
      "form:not([data-testid='photo-form'])",
    );
    const photoForm = screen.getByTestId("photo-form");
    expect(editorForm).not.toBeNull();
    expect(editorForm!.contains(photoForm)).toBe(false);
  });

  it("Save submits with serviceIds reflecting the SpecialtyPicker state", async () => {
    const { onSubmit } = setup("edit");
    const user = userEvent.setup();
    // Initial state has "signature" ticked. Tick "Gel" too.
    await user.click(screen.getByLabelText("Gel"));
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ serviceIds: ["signature", "gel"] }),
    );
  });
});
