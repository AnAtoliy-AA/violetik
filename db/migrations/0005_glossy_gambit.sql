CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"default_palette" text DEFAULT 'aubergine' NOT NULL,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"price_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"discount_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 'singleton'),
	CONSTRAINT "site_settings_discount_range" CHECK ("site_settings"."discount_percent" BETWEEN 0 AND 90)
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "site_settings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;