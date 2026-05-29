ALTER TABLE "site_settings" ADD COLUMN "markup_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "markup_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_markup_range" CHECK ("site_settings"."markup_percent" BETWEEN 0 AND 1000);