import { z } from "zod";
import { PAGE_SEO_IDS } from "./registry";

// SEO best practice: titles render fully up to ~60 chars, descriptions up
// to ~160. We allow a little headroom (admin may include a brand suffix)
// while still preventing pathological values.
const TITLE_MAX = 70;
const DESCRIPTION_MAX = 200;

const idEnum = z.enum(PAGE_SEO_IDS as [string, ...string[]]);

export const pageSeoEntrySchema = z.object({
  id: idEnum,
  titleEn: z.string().max(TITLE_MAX),
  titleRu: z.string().max(TITLE_MAX),
  titleBy: z.string().max(TITLE_MAX),
  descriptionEn: z.string().max(DESCRIPTION_MAX),
  descriptionRu: z.string().max(DESCRIPTION_MAX),
  descriptionBy: z.string().max(DESCRIPTION_MAX),
});

export const pageSeoPatchSchema = z.object({
  entries: z.array(pageSeoEntrySchema).max(PAGE_SEO_IDS.length),
});

export type PageSeoPatchEntry = z.infer<typeof pageSeoEntrySchema>;
export type PageSeoPatch = z.infer<typeof pageSeoPatchSchema>;
