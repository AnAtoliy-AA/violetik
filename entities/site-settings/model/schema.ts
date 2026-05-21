import { z } from "zod";
import { PALETTES } from "@/shared/config/palettes";
import { routing } from "@/i18n/routing";

const PALETTE_IDS = PALETTES.map((p) => p.id) as [string, ...string[]];
const LOCALES = routing.locales as readonly string[] as [string, ...string[]];

const overrideKey = z
  .string()
  .regex(
    /^(service:[a-z0-9_-]+|membership:VIP)$/,
    "Override keys must be `service:<id>` or `membership:VIP`",
  );

export const siteSettingsPatchSchema = z
  .object({
    defaultPalette: z.enum(PALETTE_IDS),
    defaultLocale: z.enum(LOCALES),
    priceOverrides: z.record(overrideKey, z.number().int().min(0).max(10_000)),
    discountPercent: z.number().int().min(0).max(90),
    discountActive: z.boolean(),
  })
  .partial();

export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;
