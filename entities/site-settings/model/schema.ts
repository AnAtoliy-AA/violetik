import { z } from "zod";
import { PALETTES } from "@/shared/config/palettes";
import { routing } from "@/i18n/routing";
import { COUNTRIES } from "@/shared/config/countries";
import { isValidTimeZone } from "@/shared/config/time-zones";

const PALETTE_IDS = PALETTES.map((p) => p.id) as [string, ...string[]];
const LOCALES = routing.locales as readonly string[] as [string, ...string[]];
const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

const overrideKey = z
  .string()
  .regex(
    /^(service:[a-z0-9_-]+|membership:VIP)$/,
    "Override keys must be `service:<id>` or `membership:VIP`",
  );

const TELEGRAM_USERNAME = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{4,31}$/u, "invalid_telegram_username")
  .nullable();

export const siteSettingsPatchSchema = z
  .object({
    defaultPalette: z.enum(PALETTE_IDS),
    defaultLocale: z.enum(LOCALES),
    priceOverrides: z.record(overrideKey, z.number().int().min(0).max(10_000)),
    discountPercent: z.number().int().min(0).max(90),
    discountActive: z.boolean(),
    markupPercent: z.number().int().min(0).max(1000),
    markupActive: z.boolean(),
    currency: z.enum(["EUR", "USD", "BYN", "RUB"]),

    addressEn: z.string().max(200),
    addressRu: z.string().max(200),
    addressBy: z.string().max(200),
    country: z.enum(COUNTRY_CODES),
    cityEn: z.string().max(120),
    cityRu: z.string().max(120),
    cityBy: z.string().max(120),
    timezone: z.string().refine(isValidTimeZone, { message: "Unknown IANA timezone" }),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    mapVisible: z.boolean(),
    telegramUsername: TELEGRAM_USERNAME.optional().default(null),
  })
  .partial()
  .superRefine((patch, ctx) => {
    // Half-pair lat/lng: when either is present in the patch, both must be
    // present (either both numbers or both null).
    const hasLat = "latitude" in patch;
    const hasLng = "longitude" in patch;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude and longitude must be set together",
        path: hasLat ? ["longitude"] : ["latitude"],
      });
      return;
    }
    if (hasLat && hasLng) {
      const latNull = patch.latitude == null;
      const lngNull = patch.longitude == null;
      if (latNull !== lngNull) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "latitude and longitude must both be set or both be null",
          path: ["latitude"],
        });
      }
    }
    // mapVisible:true requires non-null coords in the same patch.
    if (patch.mapVisible === true) {
      if (patch.latitude == null || patch.longitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mapVisible requires latitude and longitude",
          path: ["mapVisible"],
        });
      }
    }
  });

export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;
