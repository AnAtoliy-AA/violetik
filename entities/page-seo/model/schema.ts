import { z } from "zod";
import { PAGE_SEO_IDS } from "./registry";

// SEO best practice: the <title> renders fully up to ~60 chars, the meta
// description up to ~160. We allow a little headroom while still preventing
// pathological values. The visible on-page heading isn't search-truncated,
// so it gets a longer cap (some localized headings run past 70 — e.g. the
// welcome tagline at 80).
const TITLE_MAX = 70;
const HEADING_MAX = 120;
const DESCRIPTION_MAX = 200;

const idEnum = z.enum(PAGE_SEO_IDS as [string, ...string[]]);

export const pageSeoEntrySchema = z.object({
  id: idEnum,
  titleEn: z.string().max(TITLE_MAX),
  titleRu: z.string().max(TITLE_MAX),
  titleBy: z.string().max(TITLE_MAX),
  headingEn: z.string().max(HEADING_MAX),
  headingRu: z.string().max(HEADING_MAX),
  headingBy: z.string().max(HEADING_MAX),
  descriptionEn: z.string().max(DESCRIPTION_MAX),
  descriptionRu: z.string().max(DESCRIPTION_MAX),
  descriptionBy: z.string().max(DESCRIPTION_MAX),
});

export const pageSeoPatchSchema = z.object({
  entries: z.array(pageSeoEntrySchema).max(PAGE_SEO_IDS.length),
});

export type PageSeoPatchEntry = z.infer<typeof pageSeoEntrySchema>;
export type PageSeoPatch = z.infer<typeof pageSeoPatchSchema>;
