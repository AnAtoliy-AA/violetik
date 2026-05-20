CREATE TABLE "google_oauth_tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"refresh_token" text NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"scope" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_refresh_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "google_oauth_tokens" ADD CONSTRAINT "google_oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;