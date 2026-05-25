CREATE INDEX IF NOT EXISTS "service_categories_updated_by_idx" ON "service_categories" USING btree ("updated_by") WHERE updated_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_updated_by_idx" ON "services" USING btree ("updated_by") WHERE updated_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_settings_updated_by_idx" ON "site_settings" USING btree ("updated_by") WHERE updated_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_photos_uploaded_by_idx" ON "studio_photos" USING btree ("uploaded_by") WHERE uploaded_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_decided_by_idx" ON "testimonials" USING btree ("decided_by") WHERE decided_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vip_requests_decided_by_idx" ON "vip_requests" USING btree ("decided_by") WHERE decided_by IS NOT NULL;--> statement-breakpoint
-- Move the Supabase-managed rls_auto_enable() function out of `public` so PostgREST
-- stops exposing it at /rest/v1/rpc/rls_auto_enable. The function backs an event
-- trigger (`ensure_rls`) that fires on DDL — event triggers reference functions by
-- OID, so moving the schema doesn't break the trigger.
-- Wrapped in DO blocks for idempotency: on a fresh DB where Supabase hasn't
-- installed rls_auto_enable yet, the ALTER would error otherwise.
CREATE SCHEMA IF NOT EXISTS "internal";--> statement-breakpoint
DO $$
BEGIN
  ALTER FUNCTION public.rls_auto_enable() SET SCHEMA internal;
EXCEPTION
  WHEN undefined_function THEN NULL;
  WHEN duplicate_function THEN NULL;
END $$;