-- Add `removed` to the testimonial_status enum (soft-delete state).
-- ALTER TYPE ... ADD VALUE cannot run in a transaction in older Postgres;
-- IF NOT EXISTS makes it idempotent for retries.
ALTER TYPE testimonial_status ADD VALUE IF NOT EXISTS 'removed';--> statement-breakpoint

-- User-initiated change requests on an approved testimonial.
ALTER TABLE testimonials ADD COLUMN pending_edit_body text;--> statement-breakpoint
ALTER TABLE testimonials ADD COLUMN pending_removal boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE testimonials ADD COLUMN change_requested_at timestamptz;
