import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { SiteSettingsForm } from "./site-settings-form";

function renderForm() {
  const onSubmit = vi.fn().mockResolvedValue({ ok: true });
  const utils = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SiteSettingsForm
        initial={DEFAULT_SITE_SETTINGS}
        vipBasePrice={180}
        onSubmit={onSubmit}
      />
    </NextIntlClientProvider>,
  );
  return { ...utils, onSubmit };
}

describe("SiteSettingsForm", () => {
  it("renders a pill per palette with a 3-swatch preview", () => {
    renderForm();
    const pills = screen.getAllByRole("radio", { name: /Aubergine|Rose|Lilac|Mono|Ink|Moss|Bronze|Pearl|Emerald|Sapphire|Ruby|Obsidian/ });
    expect(pills).toHaveLength(12);
    const aubergine = screen.getByRole("radio", { name: /Aubergine/i });
    expect(aubergine).toHaveAttribute("aria-checked", "true");
    const swatch = aubergine.querySelector('[aria-hidden="true"]');
    expect(swatch).not.toBeNull();
    expect(swatch!.children).toHaveLength(3);
  });

  it("changes the checked palette when a different pill is clicked", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("radio", { name: /Ink/i }));
    expect(screen.getByRole("radio", { name: /Ink/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Aubergine/i })).toHaveAttribute("aria-checked", "false");
  });

  it("submits the chosen palette and locale in the patch", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.click(screen.getByRole("radio", { name: /Moss/i }));
    await user.click(screen.getByRole("radio", { name: /^RU$/i }));
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const patch = onSubmit.mock.calls[0][0];
    expect(patch.defaultPalette).toBe("moss");
    expect(patch.defaultLocale).toBe("ru");
  });

  it("renders four currency options and submits the selected one", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    expect(screen.getByRole("radio", { name: /^EUR$/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByRole("radio", { name: /^USD$/ }));
    await user.click(screen.getByRole("button", { name: /Save/ }));
    expect(onSubmit.mock.calls[0][0].currency).toBe("USD");
  });

  it("renders a VIP override (per-service overrides are retired)", () => {
    renderForm();
    expect(
      screen.getByRole("spinbutton", { name: /VIP price override/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /Signature Manicure override/ }),
    ).not.toBeInTheDocument();
  });

  it("clamps discount input to 0–90", async () => {
    const user = userEvent.setup();
    renderForm();
    const discount = screen.getByRole("spinbutton", { name: /discount percent/i }) as HTMLInputElement;
    await user.clear(discount);
    await user.type(discount, "95");
    expect(Number(discount.value)).toBe(90);
  });

  it("calls onSubmit with the form state, omitting empty overrides", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const patch = onSubmit.mock.calls[0][0];
    expect(patch.priceOverrides).toEqual({});
    expect(patch.discountPercent).toBe(0);
    expect(patch.discountActive).toBe(false);
    expect(patch.markupPercent).toBe(0);
    expect(patch.markupActive).toBe(false);
  });

  it("submits the markup percent and active toggle", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    const markup = screen.getByRole("spinbutton", {
      name: /markup percent/i,
    }) as HTMLInputElement;
    await user.clear(markup);
    await user.type(markup, "10");
    await user.click(
      screen.getByRole("checkbox", { name: /show inflated old price/i }),
    );
    await user.click(screen.getByRole("button", { name: /Save/i }));
    const patch = onSubmit.mock.calls[0][0];
    expect(patch.markupPercent).toBe(10);
    expect(patch.markupActive).toBe(true);
  });

  describe("palette live preview", () => {
    it("applies the selected palette to documentElement immediately on click", async () => {
      document.documentElement.dataset.palette = DEFAULT_SITE_SETTINGS.defaultPalette;
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("radio", { name: /Ink/i }));
      expect(document.documentElement.dataset.palette).toBe("ink");
    });

    it("reverts the palette on unmount when save was not invoked", async () => {
      document.documentElement.dataset.palette = DEFAULT_SITE_SETTINGS.defaultPalette;
      const user = userEvent.setup();
      const { unmount } = renderForm();
      await user.click(screen.getByRole("radio", { name: /Ink/i }));
      expect(document.documentElement.dataset.palette).toBe("ink");
      unmount();
      expect(document.documentElement.dataset.palette).toBe(
        DEFAULT_SITE_SETTINGS.defaultPalette,
      );
    });

    it("keeps the palette persisted after a successful save", async () => {
      document.documentElement.dataset.palette = DEFAULT_SITE_SETTINGS.defaultPalette;
      const user = userEvent.setup();
      const { unmount } = renderForm();
      await user.click(screen.getByRole("radio", { name: /Ink/i }));
      await user.click(screen.getByRole("button", { name: /Save/i }));
      await new Promise((r) => setTimeout(r, 0));
      unmount();
      expect(document.documentElement.dataset.palette).toBe("ink");
    });
  });
});
