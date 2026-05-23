"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PALETTES } from "@/shared/config/palettes";
import { cn } from "@/shared/lib/cn";
import { routing } from "@/i18n/routing";
import type {
  SiteSettings,
  SiteSettingsPatch,
} from "@/entities/site-settings";
import type { CurrencyCode } from "@/db/schema";
import { buttonClassName } from "@/shared/ui/button";

export type SubmitFn = (
  patch: SiteSettingsPatch,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface SiteSettingsFormProps {
  initial: SiteSettings;
  vipBasePrice: number;
  /**
   * Action invoked on submit. The route file passes the server action;
   * stories/tests pass a mock. Keeps this client component out of the
   * "use server" import chain.
   */
  onSubmit: SubmitFn;
}

type OverrideInput = string; // "" means "no override"

type Status =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

const CURRENCIES: readonly CurrencyCode[] = ["EUR", "USD", "BYN", "RUB"];

export function SiteSettingsForm({
  initial,
  vipBasePrice,
  onSubmit: submit,
}: SiteSettingsFormProps) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [defaultPalette, setDefaultPalette] = useState(initial.defaultPalette);
  const [defaultLocale, setDefaultLocale] = useState(initial.defaultLocale);
  const [currency, setCurrency] = useState<CurrencyCode>(initial.currency);
  const [discountPercent, setDiscountPercent] = useState(
    initial.discountPercent,
  );
  const [discountActive, setDiscountActive] = useState(initial.discountActive);

  const [vipOverride, setVipOverride] = useState<OverrideInput>(() =>
    "membership:VIP" in initial.priceOverrides
      ? String(initial.priceOverrides["membership:VIP"])
      : "",
  );

  const baselinePaletteRef = useRef(initial.defaultPalette);
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.palette = defaultPalette;
    return () => {
      html.dataset.palette = baselinePaletteRef.current;
    };
  }, [defaultPalette]);

  function buildPatch(): SiteSettingsPatch {
    const priceOverrides: Record<string, number> = {};
    if (vipOverride !== "") {
      const n = Number(vipOverride);
      if (Number.isFinite(n) && n >= 0) {
        priceOverrides["membership:VIP"] = Math.round(n);
      }
    }
    return {
      defaultPalette,
      defaultLocale,
      currency,
      priceOverrides,
      discountPercent: Math.max(0, Math.min(90, Math.round(discountPercent))),
      discountActive,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    const patch = buildPatch();
    startTransition(async () => {
      const result = await submit(patch);
      if (result.ok) {
        baselinePaletteRef.current = defaultPalette;
        setStatus({ kind: "saved" });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 px-[22px] py-6">
      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_palette")}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {PALETTES.map((p) => {
            const selected = defaultPalette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDefaultPalette(p.id)}
                className={cn(
                  "group flex items-center gap-3 rounded-full border-[0.5px] px-3 py-2",
                  "transition-colors duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  selected
                    ? "border-accent bg-surface-2 text-text"
                    : "border-line text-text-2 hover:border-line-strong hover:text-text",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex shrink-0 overflow-hidden rounded-full border-[0.5px] border-line-strong"
                >
                  {p.preview.map((color) => (
                    <span key={color} className="block size-4" style={{ background: color }} />
                  ))}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_locale")}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {routing.locales.map((l) => {
            const selected = defaultLocale === l;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={l.toUpperCase()}
                onClick={() => setDefaultLocale(l)}
                className={cn(
                  "flex items-center justify-center rounded-full border-[0.5px] px-3 py-2",
                  "transition-colors duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  selected
                    ? "border-accent bg-surface-2 text-text"
                    : "border-line text-text-2 hover:border-line-strong hover:text-text",
                )}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
                  {l}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_currency")}
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {CURRENCIES.map((c) => {
            const selected = currency === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c}
                onClick={() => setCurrency(c)}
                className={cn(
                  "flex items-center justify-center rounded-full border-[0.5px] px-3 py-2",
                  "transition-colors duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  selected
                    ? "border-accent bg-surface-2 text-text"
                    : "border-line text-text-2 hover:border-line-strong hover:text-text",
                )}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset aria-label={t("site_settings_section_vip")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_vip")}
        </legend>
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
            {t("site_settings_vip_base_label", { price: vipBasePrice })}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10_000}
            placeholder="—"
            aria-label="VIP price override"
            className="w-24 rounded border border-line bg-surface px-2 py-1 text-right"
            value={vipOverride}
            onChange={(e) => setVipOverride(e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset aria-label={t("site_settings_section_discount")}>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("site_settings_section_discount")}
        </legend>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={90}
              aria-label="discount percent"
              className="w-20 rounded border border-line bg-surface px-2 py-1 text-right"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(
                  Math.max(0, Math.min(90, Number(e.target.value) || 0)),
                )
              }
            />
            <span>%</span>
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={discountActive}
              onChange={(e) => setDiscountActive(e.target.checked)}
            />
            {t("site_settings_discount_active")}
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("site_settings_save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("site_settings_saved")}
          </span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-accent">
            {t("site_settings_error", { error: status.message })}
          </span>
        ) : null}
      </div>
    </form>
  );
}
