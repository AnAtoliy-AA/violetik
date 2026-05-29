import { z } from "zod";

export const onboardingSlugSchema = z
  .string()
  .min(1, "slug_required")
  .max(64)
  .regex(/^[a-z0-9-]+$/, "slug_invalid");

const requiredLocaleString = z.string().trim().min(1, "required").max(400);

export const onboardingSlideFormSchema = z.object({
  id: onboardingSlugSchema,
  eyebrowEn: requiredLocaleString,
  eyebrowRu: requiredLocaleString,
  eyebrowBy: requiredLocaleString,
  titleEn: requiredLocaleString,
  titleRu: requiredLocaleString,
  titleBy: requiredLocaleString,
  bodyEn: requiredLocaleString,
  bodyRu: requiredLocaleString,
  bodyBy: requiredLocaleString,
  src: z
    .string()
    .url()
    .refine(
      (url) => /\.public\.blob\.vercel-storage\.com\//.test(url),
      "not a Vercel Blob URL",
    )
    .optional(),
  width: z.coerce.number().int().min(0).max(30_000).optional(),
  height: z.coerce.number().int().min(0).max(30_000).optional(),
  blurDataUrl: z.string().optional(),
  palette: z.array(z.string()).max(8).optional(),
  variant: z.coerce.number().int().min(0).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type OnboardingSlideFormInput = z.infer<
  typeof onboardingSlideFormSchema
>;
