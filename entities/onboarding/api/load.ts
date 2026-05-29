// Server-only: imports @/db/*. Not re-exported from the slice barrel.
import { listOnboardingSlides } from "@/db/onboarding";
import { pickLocale } from "../lib/pick-localized-text";
import type { OnboardingSlideView } from "../model/types";
import type { Locale } from "@/i18n/routing";

const DEFAULT_PALETTE: readonly [string, string] = ["#c9a96e", "#7d3a6f"];

function paletteTuple(p: string[] | null): readonly [string, string] {
  if (p && p.length >= 2) return [p[0]!, p[1]!];
  return DEFAULT_PALETTE;
}

/**
 * Loads onboarding slides resolved for `locale`. Degrades to an empty list
 * when the DB is unavailable; the route falls back to a built-in default in
 * that case so onboarding never renders blank.
 */
export async function loadOnboardingSlides(
  locale: Locale,
): Promise<OnboardingSlideView[]> {
  const rows = await listOnboardingSlides();
  return rows.map((row) => {
    const title = pickLocale(
      { en: row.titleEn, ru: row.titleRu, by: row.titleBy },
      locale,
    );
    return {
      id: row.id,
      eyebrow: pickLocale(
        { en: row.eyebrowEn, ru: row.eyebrowRu, by: row.eyebrowBy },
        locale,
      ),
      title,
      body: pickLocale(
        { en: row.bodyEn, ru: row.bodyRu, by: row.bodyBy },
        locale,
      ),
      palette: paletteTuple(row.palette),
      variant: row.variant,
      image: row.src
        ? {
            // No dedicated alt column — the localized title is the most
            // descriptive accessible label for the slide image.
            src: row.src,
            alt: title,
            width: row.width ?? undefined,
            height: row.height ?? undefined,
            blurDataURL: row.blurDataUrl ?? undefined,
          }
        : undefined,
    };
  });
}
