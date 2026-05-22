ALTER TABLE "bookings" ADD COLUMN "master_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_master_idx" ON "bookings" USING btree ("master_id");
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────────────
-- Backfill: bookings created before Phase 2 had no master assignment.
-- Violetta is the seeded master in 0008_admin_masters.sql; she is
-- linked to every published service via master_services. Assign her
-- as the historical master for any orphan rows. The guard keeps the
-- backfill inert when the masters table is empty (db-null / fresh
-- installs without the seed).
-- ────────────────────────────────────────────────────────────────────

UPDATE bookings
   SET master_id = 'violetta'
 WHERE master_id IS NULL
   AND EXISTS (SELECT 1 FROM masters WHERE id = 'violetta');
