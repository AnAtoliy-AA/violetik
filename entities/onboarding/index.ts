// Client- and storybook-safe barrel. The server-only loader ships from
// `@/entities/onboarding/api/load`.
export type { OnboardingSlideView } from "./model/types";
export {
  onboardingSlideFormSchema,
  onboardingSlugSchema,
} from "./model/schema";
export type { OnboardingSlideFormInput } from "./model/schema";
export { pickLocale } from "./lib/pick-localized-text";
