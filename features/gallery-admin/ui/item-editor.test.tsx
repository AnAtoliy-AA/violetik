import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@vercel/blob/client", () => ({ upload: vi.fn() }));

import { GalleryItemEditor } from "./item-editor";

const categories = [
  { id: "chrome", name: "Chrome" },
  { id: "gel", name: "Gel" },
];

function renderEditor(onSubmit: ReturnType<typeof vi.fn>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GalleryItemEditor
        mode="create"
        initial={{
          id: "",
          categoryId: "",
          captionEn: "",
          captionRu: "",
          captionBy: "",
          alt: "",
          src: null,
          width: null,
          height: null,
          sortOrder: 0,
        }}
        categories={categories}
        storageConfigured
        onSubmit={onSubmit}
      />
    </NextIntlClientProvider>,
  );
}

describe("GalleryItemEditor", () => {
  it("submits a new item with id + category and no image", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    renderEditor(onSubmit);

    await user.type(screen.getByLabelText(en.AdminGallery.label_slug), "g9");
    await user.selectOptions(
      screen.getByLabelText(en.AdminGallery.label_category),
      "gel",
    );
    await user.click(screen.getByRole("button", { name: en.AdminGallery.cta_save }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      id: "g9",
      categoryId: "gel",
    });
    expect(onSubmit.mock.calls[0]![0].src).toBeUndefined();
  });
});
