-- Rename Belarusian locale identifier from `be` to `by` across:
--   * Schema columns: every *_be column → *_by.
--   * JSON dictionaries that store {en, ru, be} payloads.
--   * site_settings.default_locale value.

-- Column renames (data-preserving). One ALTER per column.
ALTER TABLE services RENAME COLUMN name_be TO name_by;--> statement-breakpoint
ALTER TABLE services RENAME COLUMN blurb_be TO blurb_by;--> statement-breakpoint
ALTER TABLE service_categories RENAME COLUMN name_be TO name_by;--> statement-breakpoint
ALTER TABLE masters RENAME COLUMN name_be TO name_by;--> statement-breakpoint
ALTER TABLE masters RENAME COLUMN role_be TO role_by;--> statement-breakpoint
ALTER TABLE masters RENAME COLUMN bio_be TO bio_by;--> statement-breakpoint
ALTER TABLE masters RENAME COLUMN quote_be TO quote_by;--> statement-breakpoint
ALTER TABLE site_settings RENAME COLUMN address_be TO address_by;--> statement-breakpoint
ALTER TABLE site_settings RENAME COLUMN city_be TO city_by;--> statement-breakpoint

-- JSON dictionary rewrite for services.includes (jsonb array of {en, ru, be}).
UPDATE services
  SET includes = (
    SELECT jsonb_agg(
      (i - 'be') || jsonb_build_object('by', i->'be')
    )
    FROM jsonb_array_elements(includes) AS i
  )
  WHERE includes::text LIKE '%"be"%';--> statement-breakpoint

-- Migrate default_locale.
UPDATE site_settings SET default_locale = 'by' WHERE default_locale = 'be';
