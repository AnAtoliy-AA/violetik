ALTER TABLE "site_settings" ADD COLUMN "address_en" text DEFAULT 'By appointment · Verbena Lane 14, Studio B' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_ru" text DEFAULT 'По записи · Verbena Lane 14, Studio B' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_be" text DEFAULT 'Па запісу · Verbena Lane 14, Studio B' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "country" text DEFAULT 'BY' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "city_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "city_ru" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "city_be" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "timezone" text DEFAULT 'Europe/Minsk' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_lat_range" CHECK ("site_settings"."latitude" IS NULL OR "site_settings"."latitude" BETWEEN -90 AND 90);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_lng_range" CHECK ("site_settings"."longitude" IS NULL OR "site_settings"."longitude" BETWEEN -180 AND 180);