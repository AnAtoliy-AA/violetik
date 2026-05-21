CREATE TYPE "public"."currency_code" AS ENUM('EUR', 'USD', 'BYN', 'RUB');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_be" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "service_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_be" text NOT NULL,
	"blurb_en" text NOT NULL,
	"blurb_ru" text NOT NULL,
	"blurb_be" text NOT NULL,
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "service_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "services_includes_max_8" CHECK (jsonb_array_length("services"."includes") <= 8),
	CONSTRAINT "services_price_non_negative" CHECK ("services"."price_cents" >= 0),
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "currency" "currency_code" DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_categories_sort_idx" ON "service_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "service_categories_status_idx" ON "service_categories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "services_sort_idx" ON "services" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");