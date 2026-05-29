import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@vercel/blob/client", () => ({ upload: vi.fn() }));

import { OnboardingSlideEditor } from "./slide-editor";

const initial = {
  id: "",
  eyebrowEn: "",
  eyebrowRu: "",
  eyebrowBy: "",
  titleEn: "",
  titleRu: "",
  titleBy: "",
  bodyEn: "",
  bodyRu: "",
  bodyBy: "",
  src: null,
  width: null,
  height: null,
  variant: 1,
  sortOrder: 0,
};

function renderEditor(onSubmit: ReturnType<typeof vi.fn>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OnboardingSlideEditor
        mode="create"
        initial={initial}
        storageConfigured
        onSubmit={onSubmit}
      />
    </NextIntlClientProvider>,
  );
}

describe("OnboardingSlideEditor", () => {
  it("submits a fully filled trilingual slide", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    renderEditor(onSubmit);

    await user.type(screen.getByLabelText(en.AdminOnboarding.label_slug), "atelier");
    for (const key of [
      "label_eyebrow_en", "label_eyebrow_ru", "label_eyebrow_by",
      "label_title_en", "label_title_ru", "label_title_by",
      "label_body_en", "label_body_ru", "label_body_by",
    ] as const) {
      await user.type(
        screen.getByLabelText(en.AdminOnboarding[key]),
        "x",
      );
    }
    await user.click(screen.getByRole("button", { name: en.AdminOnboarding.cta_save }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ id: "atelier", variant: 1 });
  });

  it("shows a validation error when a required field is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    renderEditor(onSubmit);
    await user.type(screen.getByLabelText(en.AdminOnboarding.label_slug), "atelier");
    await user.click(screen.getByRole("button", { name: en.AdminOnboarding.cta_save }));
    expect(
      (await screen.findAllByText(en.AdminOnboarding.validation_required)).length,
    ).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
