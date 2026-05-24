CREATE TYPE "public"."vip_request_status" AS ENUM('pending', 'approved', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "vip_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "vip_request_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"decline_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vip_requests" ADD CONSTRAINT "vip_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_requests" ADD CONSTRAINT "vip_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vip_requests_user_idx" ON "vip_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vip_requests_status_idx" ON "vip_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "vip_requests_one_pending_per_user" ON "vip_requests" USING btree ("user_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "vip_requests_active_expiry_idx" ON "vip_requests" USING btree ("expires_at") WHERE status = 'approved';