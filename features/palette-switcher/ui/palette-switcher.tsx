"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PALETTES,
  type PaletteId,
  writePaletteCookie,
} from "@/shared/config/palettes";
import { cn } from "@/shared/lib/cn";

export interface PaletteSwitcherProps {
  className?: string;
}

export function PaletteSwitcher({ className }: PaletteSwitcherProps) {
  const t = useTranslations("PaletteSwitcher");
  const [active, setActive] = useState<PaletteId | null>(null);

  // Hydrate from the attribute the init script already applied, so the
  // selected option matches the visible palette without flicker.
  useEffect(() => {
    const attr = document.documentElement.getAttribute(
      "data-palette",
    ) as PaletteId | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount sync, identical to the canonical next-themes pattern
    setActive(attr);
  }, []);

  const handleSelect = (id: PaletteId) => {
    setActive(id);
    writePaletteCookie(id);
  };

  return (
    <fieldset
      aria-label={t("label")}
      className={cn("flex flex-col gap-3", className)}
    >
      <legend className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-2">
        {t("label")}
      </legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PALETTES.map((palette) => {
          const selected = palette.id === active;
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(palette.id)}
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
                aria-hidden
                className="flex shrink-0 overflow-hidden rounded-full border-[0.5px] border-line-strong"
              >
                {palette.preview.map((color, i) => (
                  <span
                    key={i}
                    className="block size-4"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
                {t(`palettes.${palette.id}`)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
