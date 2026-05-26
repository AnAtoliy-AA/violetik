"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/shared/ui/toast";
import { PressableSurface } from "@/shared/ui/pressable-surface";

export interface TappableAddressProps {
  address: string;
  /** Maps deep-link (Google Maps URL); falls back to OpenStreetMap if null. */
  mapsHref: string | null;
}

export function TappableAddress({ address, mapsHref }: TappableAddressProps) {
  const t = useTranslations("Home");
  const { push } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      push({
        intent: "success",
        eyebrow: t("address_copy_label"),
        body: t("address_copied_toast"),
      });
    } catch {
      push({
        intent: "error",
        body: t("address_copy_label"),
      });
    }
  };

  return (
    <div className="mt-4 mx-auto inline-flex items-center gap-2 rounded-full bg-bg/60 px-2 py-1 backdrop-blur-sm">
      <PressableSurface
        onClick={copy}
        aria-label={t("address_copy_label")}
        className="rounded-full font-mono text-[9px] uppercase tracking-[0.32em] text-text-3 hover:text-text px-3 py-2 no-underline"
      >
        {address}
      </PressableSurface>
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("address_maps_label")}
          className="relative inline-flex size-7 items-center justify-center rounded-full border-[0.5px] border-line text-text-3 hover:text-text before:absolute before:-inset-2 before:content-['']"
          onClick={() =>
            push({
              intent: "info",
              body: t("address_maps_toast"),
            })
          }
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
