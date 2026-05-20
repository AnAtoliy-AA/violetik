ALTER TABLE "users" ALTER COLUMN "telegram_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_sub" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
CREATE INDEX "users_google_sub_idx" ON "users" USING btree ("google_sub");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub");