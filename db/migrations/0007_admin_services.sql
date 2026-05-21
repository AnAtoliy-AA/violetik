CREATE TYPE "public"."currency_code" AS ENUM('EUR', 'USD', 'BYN', 'RUB');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_be" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "service_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_be" text NOT NULL,
	"blurb_en" text NOT NULL,
	"blurb_ru" text NOT NULL,
	"blurb_be" text NOT NULL,
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "service_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "services_includes_max_8" CHECK (jsonb_array_length("services"."includes") <= 8),
	CONSTRAINT "services_price_non_negative" CHECK ("services"."price_cents" >= 0),
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "currency" "currency_code" DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_categories_sort_idx" ON "service_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "service_categories_status_idx" ON "service_categories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "services_sort_idx" ON "services" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
-- Seed: four legacy categories (sort order matches the historic Care/Gel/Design/Form order in entities/studio/model/data.ts).
INSERT INTO "service_categories" ("id", "name_en", "name_ru", "name_be", "sort_order", "status")
VALUES
  ('care',   'Care',   'Уход',   'Догляд', 1, 'published'),
  ('gel',    'Gel',    'Гель',   'Гель',   2, 'published'),
  ('design', 'Design', 'Дизайн', 'Дызайн', 3, 'published'),
  ('form',   'Form',   'Форма',  'Форма',  4, 'published')
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
-- Seed: six legacy services. RU/BE strings authored from the existing
-- translation style in messages/{ru,be}.json; bullet translations are
-- inline and may be tightened by Violetta before launch.
INSERT INTO "services" (
  "id", "category_id",
  "name_en", "name_ru", "name_be",
  "blurb_en", "blurb_ru", "blurb_be",
  "includes",
  "price_cents", "duration_minutes",
  "sort_order", "status"
) VALUES
  (
    'signature', 'care',
    'Signature Manicure',
    'Сигнатурный маникюр',
    'Сігнатурны манікюр',
    'Russian dry technique, cuticle work, hydration ritual & gloss finish.',
    'Русская сухая техника, работа с кутикулой, ритуал увлажнения и финишный блеск.',
    'Расейская сухая тэхніка, праца з кутыкулай, рытуал увільгатнення і фініш-бляск.',
    '[
      {"en":"Hand soak in rose & milk","ru":"Ванночка с розой и молоком","be":"Ванначка з ружай і малаком"},
      {"en":"Russian e-file manicure","ru":"Аппаратный маникюр","be":"Апаратны манікюр"},
      {"en":"Cuticle reconstruction","ru":"Восстановление кутикулы","be":"Аднаўленне кутыкулы"},
      {"en":"Bespoke gloss","ru":"Авторский блеск","be":"Аўтарскі бляск"}
    ]'::jsonb,
    9500, 75,
    1, 'published'
  ),
  (
    'gel', 'gel',
    'Couture Gel',
    'Кутюр-гель',
    'Кутюр-гель',
    'Long-wear Japanese gel in a single tone or a curated nude palette.',
    'Долговечный японский гель в одном тоне или подобранной нюдовой палитре.',
    'Доўгатрывалы японскі гель у адным тоне або падабранай нюдавай палітры.',
    '[
      {"en":"Signature prep","ru":"Сигнатурная подготовка","be":"Сігнатурная падрыхтоўка"},
      {"en":"Japanese gel application","ru":"Нанесение японского геля","be":"Нанясенне японскага гелю"},
      {"en":"Edge sculpt & shape","ru":"Скульптура и форма края","be":"Скульптура і форма края"},
      {"en":"Two-week guarantee","ru":"Гарантия две недели","be":"Гарантыя два тыдні"}
    ]'::jsonb,
    14500, 120,
    2, 'published'
  ),
  (
    'editorial', 'design',
    'Editorial Art',
    'Эдиториал-арт',
    'Эдыторыял-арт',
    'Bespoke nail design — chrome, lace, hand-painted miniatures.',
    'Авторский нейл-дизайн — хром, кружево, ручная роспись.',
    'Аўтарскі нэйл-дызайн — хром, карункі, ручны роспіс.',
    '[
      {"en":"Mood consultation","ru":"Консультация по настроению","be":"Кансультацыя па настроі"},
      {"en":"Hand-painted artwork","ru":"Ручная роспись","be":"Ручны роспіс"},
      {"en":"3D detailing on request","ru":"3D-детали по запросу","be":"3D-дэталі на запыт"},
      {"en":"Photography of the set","ru":"Фотосъёмка сета","be":"Фотаздымка сэта"}
    ]'::jsonb,
    19500, 150,
    3, 'published'
  ),
  (
    'extensions', 'form',
    'Glass Extensions',
    'Стеклянное наращивание',
    'Шкляное нарошчванне',
    'Sculpted soft-gel extensions in glass, almond or ballerina silhouettes.',
    'Скульптурное наращивание мягким гелем — стекло, миндаль, балерина.',
    'Скульптурнае нарошчванне мяккім гелем — шкло, мігдал, балерына.',
    '[
      {"en":"Form sculpting","ru":"Лепка формы","be":"Ляпленне формы"},
      {"en":"Architectural shape","ru":"Архитектурная форма","be":"Архітэктурная форма"},
      {"en":"Strength layer","ru":"Слой прочности","be":"Слой моцы"},
      {"en":"Mirror buff & seal","ru":"Зеркальная полировка и герметизация","be":"Люстраная паліроўка і герметызацыя"}
    ]'::jsonb,
    24000, 180,
    4, 'published'
  ),
  (
    'pedi', 'care',
    'Spa Pedicure',
    'Спа-педикюр',
    'Спа-педыкюр',
    'Foot bath in violet salts, gentle exfoliation and lacquered finish.',
    'Ванна для ног с фиалковой солью, мягкая эксфолиация и финиш с лаком.',
    'Ванна для ног з фіялкавай соллю, мяккая эксфаліяцыя і фініш з лакам.',
    '[
      {"en":"Violet salt bath","ru":"Ванна с фиалковой солью","be":"Ванна з фіялкавай соллю"},
      {"en":"Heel restoration","ru":"Восстановление пяток","be":"Аднаўленне пятак"},
      {"en":"Massage with cassis oil","ru":"Массаж с маслом смородины","be":"Масаж з алеем парэчкі"},
      {"en":"Lacquer or gel finish","ru":"Финиш лаком или гелем","be":"Фініш лакам або гелем"}
    ]'::jsonb,
    11000, 90,
    5, 'published'
  ),
  (
    'removal', 'care',
    'Gentle Removal',
    'Бережное снятие',
    'Беражлівае зняцце',
    'Soak-off, nail rehab and a single coat of strengthener.',
    'Деликатное снятие, восстановление ногтей и один слой укрепителя.',
    'Далікатнае зняцце, аднаўленне пазногцяў і адзін слой умацавальніка.',
    '[
      {"en":"Soak-off","ru":"Размачивание","be":"Размочванне"},
      {"en":"Nail rehab","ru":"Восстановление ногтей","be":"Аднаўленне пазногцяў"},
      {"en":"Strengthener","ru":"Укрепитель","be":"Умацавальнік"},
      {"en":"Cuticle oil","ru":"Масло для кутикулы","be":"Алей для кутыкулы"}
    ]'::jsonb,
    4000, 45,
    6, 'published'
  )
ON CONFLICT (id) DO NOTHING;