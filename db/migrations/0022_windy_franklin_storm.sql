CREATE TABLE "page_seo" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"title_ru" text DEFAULT '' NOT NULL,
	"title_by" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ru" text DEFAULT '' NOT NULL,
	"description_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "page_seo" ADD CONSTRAINT "page_seo_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;