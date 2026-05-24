import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ServiceEditor } from "./service-editor";

const categories = [
  { id: "care", name: "Care" },
  { id: "gel", name: "Gel" },
];

function makeInitial() {
  return {
    id: "signature",
    categoryId: "care",
    nameEn: "Signature",
    nameRu: "Сигнатур",
    nameBy: "Сігнатур",
    blurbEn: "EN blurb",
    blurbRu: "RU blurb",
    blurbBy: "BE blurb",
    includes: [],
    priceCents: 9500,
    durationMinutes: 75,
    sortOrder: 1,
    status: "published" as const,
  };
}

function setup(
  mode: "create" | "edit",
  initial = makeInitial(),
) {
  const onSubmit = vi.fn(async () => ({ ok: true as const }));
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ServiceEditor
        mode={mode}
        initial={initial}
        categories={categories}
        onSubmit={onSubmit}
      />
    </NextIntlClientProvider>,
  );
  return { onSubmit };
}

describe("ServiceEditor", () => {
  it("freezes the slug input on edit", () => {
    setup("edit");
    expect(screen.getByLabelText(/^Slug$/)).toBeDisabled();
  });

  it("converts a major-units price input to cents on submit (9500 → '95')", () => {
    setup("edit");
    const priceInput = screen.getByLabelText(/^Price$/) as HTMLInputElement;
    expect(priceInput.value).toBe("95");
  });

  it("rounds a fractional price '95.5' to 9550 cents", async () => {
    const { onSubmit } = setup("edit");
    const user = userEvent.setup();
    const priceInput = screen.getByLabelText(/^Price$/);
    await user.clear(priceInput);
    await user.type(priceInput, "95.5");
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ priceCents: 9550 }),
    );
  });

  it("rejects an empty RU blurb with an inline error", async () => {
    const { onSubmit } = setup("edit");
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Blurb \(Russian\)/));
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Required/).length).toBeGreaterThan(0);
  });

  // Regression: PhotoUploadRow has its own <form action={uploadAction}>.
  // If photoSlot is rendered inside the editor's <form>, React surfaces a
  // hydration error ("<form> cannot be a descendant of <form>").
  it("renders photoSlot outside the editor's <form>", () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ServiceEditor
          mode="edit"
          initial={makeInitial()}
          categories={categories}
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
});
