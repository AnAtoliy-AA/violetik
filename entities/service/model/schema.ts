import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1, "slug_required")
  .max(64)
  .regex(/^[a-z0-9-]+$/, "slug_invalid");

const requiredLocaleString = z.string().trim().min(1, "required").max(280);

const includeEntrySchema = z.object({
  en: requiredLocaleString,
  ru: requiredLocaleString,
  be: requiredLocaleString,
});

export const statusSchema = z.enum(["draft", "published", "archived"]);

export const categoryFormSchema = z.object({
  id: slugSchema,
  nameEn: requiredLocaleString,
  nameRu: requiredLocaleString,
  nameBe: requiredLocaleString,
  sortOrder: z.number().int().min(0).optional(),
  status: statusSchema,
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const serviceFormSchema = z.object({
  id: slugSchema,
  categoryId: slugSchema,
  nameEn: requiredLocaleString,
  nameRu: requiredLocaleString,
  nameBe: requiredLocaleString,
  blurbEn: requiredLocaleString,
  blurbRu: requiredLocaleString,
  blurbBe: requiredLocaleString,
  includes: z.array(includeEntrySchema).max(8),
  priceCents: z.number().int().min(0).max(10_000_000),
  durationMinutes: z.number().int().min(1).max(1_440),
  sortOrder: z.number().int().min(0).optional(),
  status: statusSchema,
});

export type ServiceFormInput = z.infer<typeof serviceFormSchema>;
