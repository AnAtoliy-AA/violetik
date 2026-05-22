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
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────────────
-- Seed: Violetta Marchenko + her current specialties (every published
-- service). Idempotent so re-running the migration in CI is a no-op.
-- Mirrors the seed pattern in 0007_admin_services.sql.
-- ────────────────────────────────────────────────────────────────────

INSERT INTO masters
  (id, name_en, name_ru, name_be, role_en, role_ru, role_be,
   bio_en, bio_ru, bio_be, quote_en, quote_ru, quote_be,
   years, sort_order, status)
VALUES (
  'violetta',
  'Violetta Marchenko', 'Виолетта Марченко', 'Віялета Марчанка',
  'Master nail artist & founder',
  'Мастер ногтевого сервиса и основательница',
  'Майстра ногцевага сэрвісу і заснавальніца',
  'Trained in Milan and Kyiv, Violetta runs a one-chair atelier — one guest at a time, by appointment only. Specialising in editorial nail design, glass shapes and Japanese gel.',
  'Обучалась в Милане и Киеве. Виолетта ведёт ателье на одно кресло — один гость за раз, только по предварительной записи. Специализация: редакторский дизайн ногтей, glass shape и японский гель.',
  'Навучалася ў Мілане і Кіеве. Віялета вядзе атэлье на адно крэсла — адзін госць за раз, толькі па запісе. Спецыялізацыя: рэдактарскі дызайн ногцяў, glass shape і японскі гель.',
  'A manicure is the smallest piece of jewellery a woman wears every day.',
  'Маникюр — это самое маленькое украшение, которое женщина носит каждый день.',
  'Манікюр — гэта самая маленькая упрыгожанне, якое жанчына носіць кожны дзень.',
  11, 0, 'published'
)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- Link Violetta to every published service. Reseeding is safe — the
-- composite PK + ON CONFLICT makes the INSERT a no-op for existing
-- rows. New services added later default to *not* linked, so each new
-- service must be explicitly assigned via the admin specialty picker.
INSERT INTO master_services (master_id, service_id)
SELECT 'violetta', id FROM services WHERE status = 'published'
ON CONFLICT (master_id, service_id) DO NOTHING;