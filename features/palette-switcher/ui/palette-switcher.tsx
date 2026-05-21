"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import {
  PALETTES,
  type Palette,
  type PaletteId,
  writePaletteCookie,
} from "@/shared/config/palettes";
import { cn } from "@/shared/lib/cn";

export interface PaletteSwitcherProps {
  className?: string;
}

function spawnPaletteSweep(x: number, y: number, accent: string) {
  if (typeof document === "undefined") return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const sweep = document.createElement("div");
  sweep.className = "palette-sweep";
  sweep.style.left = `${x - 18}px`;
  sweep.style.top = `${y - 18}px`;
  sweep.style.setProperty("--palette-sweep-color", accent);
  document.body.appendChild(sweep);
  sweep.addEventListener(
    "animationend",
    () => {
      sweep.remove();
    },
    { once: true },
  );
  // Defensive cleanup in case the animationend event doesn't fire.
  window.setTimeout(() => {
    sweep.remove();
  }, 700);
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

  const handleSelect = (
    event: MouseEvent<HTMLButtonElement>,
    palette: Palette,
  ) => {
    setActive(palette.id as PaletteId);
    writePaletteCookie(palette.id as PaletteId);
    const rect = event.currentTarget.getBoundingClientRect();
    spawnPaletteSweep(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      palette.preview[2],
    );
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
              onClick={(event) => handleSelect(event, palette)}
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
