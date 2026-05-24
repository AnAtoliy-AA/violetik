ALTER TABLE "masters" ADD COLUMN "sets_label" text DEFAULT '' NOT NULL;--> statement-breakpoint

-- Backfill the seeded master so the home strip doesn't render a bare
-- "11 years" line until an admin opens the editor. Idempotent — only
-- the row created by 0008's seed is touched.
UPDATE "masters" SET "sets_label" = '600+' WHERE "id" = 'violetta' AND "sets_label" = '';