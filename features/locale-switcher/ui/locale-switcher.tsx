"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { saveLocalePreferenceAction } from "../api/save-locale";

export interface LocaleSwitcherProps {
  variant?: "header" | "welcome";
}

export function LocaleSwitcher({ variant = "header" }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const sizeClass =
    variant === "welcome"
      ? "px-2 py-1 text-[10px]"
      : "px-2.5 py-1.5 text-[11px]";

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-line bg-transparent p-0.5"
    >
      {routing.locales.map((l) => {
        const selected = locale === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={l.toUpperCase()}
            disabled={isPending}
            onClick={() => {
              if (l === locale) return;
              // Persist the choice for signed-in users so the
              // notification dispatcher can localise pushes that fire
              // outside a request context (cron, server-initiated).
              // Failure is silent — anonymous visitors just no-op.
              void saveLocalePreferenceAction(l).catch(() => {});
              startTransition(() => {
                router.replace(pathname, { locale: l });
              });
            }}
            className={cn(
              "relative rounded-full font-mono uppercase tracking-[0.18em]",
              // The pills stay visually compact; a `before` pseudo extends the
              // tap target vertically to ~44px so each locale clears the touch
              // minimum on mobile. Vertical-only keeps neighbours unambiguous.
              "before:absolute before:-inset-y-[11px] before:inset-x-0 before:content-['']",
              sizeClass,
              "transition-colors duration-fast ease-out",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              selected
                ? "bg-surface-2 text-text"
                : "text-text-2 hover:text-text",
            )}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
