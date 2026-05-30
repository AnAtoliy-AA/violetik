import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { GalleryCategoryEditor } from "./category-editor";

function renderEditor(onSubmit: ReturnType<typeof vi.fn>, mode: "create" | "edit" = "create") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GalleryCategoryEditor
        mode={mode}
        initial={{ id: "", nameEn: "", nameRu: "", nameBy: "", sortOrder: 0 }}
        onSubmit={onSubmit}
      />
    </NextIntlClientProvider>,
  );
}

describe("GalleryCategoryEditor", () => {
  it("submits a valid trilingual category", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    renderEditor(onSubmit);

    await user.type(screen.getByLabelText(en.AdminGallery.label_slug), "editorial");
    await user.type(screen.getByLabelText(en.AdminGallery.label_name_en), "Editorial");
    await user.type(screen.getByLabelText(en.AdminGallery.label_name_ru), "Эдиториал");
    await user.type(screen.getByLabelText(en.AdminGallery.label_name_by), "Эдыторыял");
    await user.click(screen.getByRole("button", { name: en.AdminGallery.cta_save }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      id: "editorial",
      nameEn: "Editorial",
    });
  });

  it("shows a validation error and does not submit an invalid slug", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    renderEditor(onSubmit);

    await user.type(screen.getByLabelText(en.AdminGallery.label_slug), "Bad Slug");
    await user.type(screen.getByLabelText(en.AdminGallery.label_name_en), "E");
    await user.type(screen.getByLabelText(en.AdminGallery.label_name_ru), "E");
    await user.type(screen.getByLabelText(en.AdminGallery.label_name_by), "E");
    await user.click(screen.getByRole("button", { name: en.AdminGallery.cta_save }));

    expect(
      await screen.findByText(en.AdminGallery.validation_slug_invalid),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
