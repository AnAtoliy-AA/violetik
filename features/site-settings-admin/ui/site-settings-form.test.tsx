import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { DEFAULT_SITE_SETTINGS } from "@/entities/site-settings";
import { SiteSettingsForm } from "./site-settings-form";

const services = [
  { id: "signature", name: "Signature Manicure", basePrice: 95 },
  { id: "gel", name: "Couture Gel", basePrice: 145 },
];

function renderForm() {
  const onSubmit = vi.fn().mockResolvedValue({ ok: true });
  const utils = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SiteSettingsForm
        initial={DEFAULT_SITE_SETTINGS}
        services={services}
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
    // The initial defaultPalette is `aubergine` per DEFAULT_SITE_SETTINGS.
    const aubergine = screen.getByRole("radio", { name: /Aubergine/i });
    expect(aubergine).toHaveAttribute("aria-checked", "true");
    // Each pill contains a 3-color swatch row (one <span> per color, aria-hidden).
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

  it("renders an override input per service plus a VIP override", () => {
    renderForm();
    expect(
      screen.getByRole("spinbutton", { name: /Signature Manicure override/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /Couture Gel override/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /VIP price override/i }),
    ).toBeInTheDocument();
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
    const gel = screen.getByRole("spinbutton", { name: /Couture Gel override/ });
    await user.type(gel, "160");
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const patch = onSubmit.mock.calls[0][0];
    expect(patch.priceOverrides).toEqual({ "service:gel": 160 });
    expect(patch.discountPercent).toBe(0);
    expect(patch.discountActive).toBe(false);
  });
});
