CREATE TYPE "public"."master_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "master_services" (
	"master_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_services_master_id_service_id_pk" PRIMARY KEY("master_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "masters" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_be" text NOT NULL,
	"role_en" text NOT NULL,
	"role_ru" text NOT NULL,
	"role_be" text NOT NULL,
	"bio_en" text NOT NULL,
	"bio_ru" text NOT NULL,
	"bio_be" text NOT NULL,
	"quote_en" text NOT NULL,
	"quote_ru" text NOT NULL,
	"quote_be" text NOT NULL,
	"years" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "master_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "master_services" ADD CONSTRAINT "master_services_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_services" ADD CONSTRAINT "master_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_services_master_idx" ON "master_services" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "master_services_service_idx" ON "master_services" USING btree ("service_id");