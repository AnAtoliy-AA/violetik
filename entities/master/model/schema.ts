import { z } from "zod";
import { slugSchema } from "@/entities/service/model/schema";

export const masterStatusSchema = z.enum(["draft", "published", "archived"]);

// Local factory — services/schema's `requiredLocaleString` is private
// and fixed at max=280. Masters need varying caps (80 / 120 / 1000 /
// 280) so we keep the factory here rather than refactoring the
// services schema in this PR.
const localeString = (max: number) =>
  z.string().trim().min(1, "required").max(max);

const TELEGRAM_USERNAME = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{4,31}$/u, "invalid_telegram_username")
  .nullable();

export const masterFormSchema = z.object({
  id: slugSchema,
  nameEn: localeString(80),
  nameRu: localeString(80),
  nameBy: localeString(80),
  roleEn: localeString(120),
  roleRu: localeString(120),
  roleBy: localeString(120),
  bioEn: localeString(1000),
  bioRu: localeString(1000),
  bioBy: localeString(1000),
  quoteEn: localeString(280),
  quoteRu: localeString(280),
  quoteBy: localeString(280),
  years: z.number().int().min(0).max(80),
  setsLabel: z.string().trim().max(80),
  sortOrder: z.number().int().min(0),
  status: masterStatusSchema,
  serviceIds: z.array(slugSchema).max(200),
  telegramUsername: TELEGRAM_USERNAME.optional().default(null),
});

export type MasterFormInput = z.infer<typeof masterFormSchema>;
