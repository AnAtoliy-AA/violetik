import { z } from "zod";

export const gallerySlugSchema = z
  .string()
  .min(1, "slug_required")
  .max(64)
  .regex(/^[a-z0-9-]+$/, "slug_invalid");

const requiredLocaleString = z.string().trim().min(1, "required").max(120);
const optionalCaption = z
  .string()
  .trim()
  .max(280)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const galleryCategoryFormSchema = z.object({
  id: gallerySlugSchema,
  nameEn: requiredLocaleString,
  nameRu: requiredLocaleString,
  nameBy: requiredLocaleString,
  sortOrder: z.number().int().min(0).optional(),
});

export type GalleryCategoryFormInput = z.infer<typeof galleryCategoryFormSchema>;

export const galleryItemFormSchema = z.object({
  id: gallerySlugSchema,
  categoryId: gallerySlugSchema,
  captionEn: optionalCaption,
  captionRu: optionalCaption,
  captionBy: optionalCaption,
  alt: z.string().trim().max(280).optional(),
  // src is optional: an item with no uploaded photo renders the palette
  // gradient fallback. When present it must be a Vercel Blob URL.
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
  sortOrder: z.number().int().min(0).optional(),
});

export type GalleryItemFormInput = z.infer<typeof galleryItemFormSchema>;
