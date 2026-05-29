import type { ImageAsset } from "@/entities/studio";

/**
 * An onboarding slide resolved for the active locale, shaped to feed the
 * existing `OnboardingSlide` component. `palette` is the gradient used by
 * the NailTile placeholder; `image` is an optional real photograph.
 */
export interface OnboardingSlideView {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  palette: readonly [string, string];
  variant: number;
  image?: ImageAsset;
}
