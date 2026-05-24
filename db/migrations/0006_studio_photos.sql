CREATE TYPE "public"."photo_slot_kind" AS ENUM('service', 'gallery', 'atelier', 'master', 'testimonial', 'profile');--> statement-breakpoint
CREATE TABLE "studio_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"slot_kind" "photo_slot_kind" NOT NULL,
	"slot_id" text NOT NULL,
	"src" text NOT NULL,
	"alt" text,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" text
);
--> statement-breakpoint
ALTER TABLE "studio_photos" ADD CONSTRAINT "studio_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "studio_photos_slot_uq" ON "studio_photos" USING btree ("slot_kind","slot_id");