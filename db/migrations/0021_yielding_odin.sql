CREATE TABLE "gallery_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_by" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"caption_en" text,
	"caption_ru" text,
	"caption_by" text,
	"alt" text,
	"src" text,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"palette" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "onboarding_slides" (
	"id" text PRIMARY KEY NOT NULL,
	"eyebrow_en" text NOT NULL,
	"eyebrow_ru" text NOT NULL,
	"eyebrow_by" text NOT NULL,
	"title_en" text NOT NULL,
	"title_ru" text NOT NULL,
	"title_by" text NOT NULL,
	"body_en" text NOT NULL,
	"body_ru" text NOT NULL,
	"body_by" text NOT NULL,
	"src" text,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"palette" jsonb,
	"variant" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "gallery_categories" ADD CONSTRAINT "gallery_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_category_id_gallery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."gallery_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_slides" ADD CONSTRAINT "onboarding_slides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_categories_sort_idx" ON "gallery_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "gallery_categories_updated_by_idx" ON "gallery_categories" USING btree ("updated_by") WHERE updated_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX "gallery_items_category_idx" ON "gallery_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "gallery_items_sort_idx" ON "gallery_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "gallery_items_updated_by_idx" ON "gallery_items" USING btree ("updated_by") WHERE updated_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX "onboarding_slides_sort_idx" ON "onboarding_slides" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "onboarding_slides_updated_by_idx" ON "onboarding_slides" USING btree ("updated_by") WHERE updated_by IS NOT NULL;
--> statement-breakpoint
-- Idempotent seed: migrate the legacy hardcoded gallery + onboarding
-- content so nothing disappears visually. ON CONFLICT DO NOTHING keeps
-- this safe to re-run / run against a partially-seeded DB.
INSERT INTO "gallery_categories" ("id","name_en","name_ru","name_by","sort_order") VALUES ('editorial','Editorial','Эдиториал','Эдыторыял',1) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_categories" ("id","name_en","name_ru","name_by","sort_order") VALUES ('gel','Gel','Гель','Гель',2) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_categories" ("id","name_en","name_ru","name_by","sort_order") VALUES ('chrome','Chrome','Хром','Хром',3) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_categories" ("id","name_en","name_ru","name_by","sort_order") VALUES ('lace','Lace','Кружево','Карункі',4) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_categories" ("id","name_en","name_ru","name_by","sort_order") VALUES ('bridal','Bridal','Свадебный','Вясельны',5) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g1','chrome','["#c9a96e", "#7d3a6f"]'::jsonb,1) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g2','editorial','["#d9a3b6", "#1a0f1f"]'::jsonb,2) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g3','gel','["#9d7bc7", "#3a2050"]'::jsonb,3) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g4','lace','["#f3ead8", "#7d3a6f"]'::jsonb,4) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g5','chrome','["#e8cf99", "#2a1a30"]'::jsonb,5) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g6','editorial','["#7d3a6f", "#14091a"]'::jsonb,6) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g7','bridal','["#f3ead8", "#d9a3b6"]'::jsonb,7) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "gallery_items" ("id","category_id","palette","sort_order") VALUES ('g8','gel','["#9d7bc7", "#c9a96e"]'::jsonb,8) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "onboarding_slides" ("id","eyebrow_en","eyebrow_ru","eyebrow_by","title_en","title_ru","title_by","body_en","body_ru","body_by","palette","variant","sort_order") VALUES ('atelier','01 / ATELIER','01 / АТЕЛЬЕ','01 / АТЭЛЬЕ','A studio of one','Студия на одного','Студыя на аднаго','One chair, one hour, one set of hands — yours. No queues, no overhearing. Just the room and what we''re making.','Одно кресло, один час, одна пара рук — ваши. Без очередей и подслушанных разговоров. Только комната и то, что мы создаём.','Адно крэсла, адна гадзіна, адна пара рук — вашы. Без чэргаў і падслуханых размоў. Толькі пакой і тое, што мы ствараем.','["#c9a96e", "#7d3a6f"]'::jsonb,1,1) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "onboarding_slides" ("id","eyebrow_en","eyebrow_ru","eyebrow_by","title_en","title_ru","title_by","body_en","body_ru","body_by","palette","variant","sort_order") VALUES ('ritual','02 / RITUAL','02 / РИТУАЛ','02 / РЫТУАЛ','Designed like couture','Сделано как кутюр','Зроблена як кутюр','A sitting is a small ceremony. Tea, a mood conversation, then ninety quiet minutes of hands.','Визит — это маленькая церемония. Чай, разговор о настроении, потом девяносто тихих минут работы.','Візіт — гэта маленькая цырымонія. Гарбата, гутарка пра настрой, потым дзевяноста ціхіх хвілін працы.','["#d9a3b6", "#3a2050"]'::jsonb,2,2) ON CONFLICT ("id") DO NOTHING;
