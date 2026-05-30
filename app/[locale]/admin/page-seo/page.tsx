import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { getAllPageSeo } from "@/db/page-seo";
import {
  PAGE_SEO_PAGES,
  resolvePageMeta,
  resolvePageHeading,
} from "@/entities/page-seo";
import { routing, type Locale } from "@/i18n/routing";
import { AppHeader } from "@/widgets/app-header";
import {
  PageSeoForm,
  updatePageSeoAction,
  type LocaleDefaults,
  type PageSeoDescriptor,
} from "@/features/page-seo-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `Violetta — ${t("page_seo_plate_title")}` };
}

export default async function AdminPageSeoRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const overrides = await getAllPageSeo();

  // Build the translation default (placeholder) for every page × locale,
  // using the same resolvers the site renders with so the admin's
  // placeholders exactly match what's shown when a field is left blank.
  const pages: PageSeoDescriptor[] = await Promise.all(
    PAGE_SEO_PAGES.map(async (page) => {
      const defaults = {} as LocaleDefaults;
      await Promise.all(
        routing.locales.map(async (l) => {
          const [tns, tSite] = await Promise.all([
            getTranslations({ locale: l, namespace: page.namespace }),
            getTranslations({ locale: l, namespace: "Site" }),
          ]);
          const translate = (ns: string, key: string) =>
            ns === "Site" ? tSite(key) : tns(key);
          const meta = resolvePageMeta({
            pageId: page.id,
            locale: l as Locale,
            overrides: {},
            translate,
          });
          const heading = resolvePageHeading({
            pageId: page.id,
            locale: l as Locale,
            overrides: {},
            translate,
          });
          defaults[l as Locale] = {
            title: meta.title,
            heading: heading.title,
            description: meta.description,
          };
        }),
      );
      return {
        id: page.id,
        path: page.path,
        label: t(`page_seo_page_${page.id.replace("-", "_")}`),
        defaults,
      };
    }),
  );

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("page_seo_plate_title")} admin />
      <PageSeoForm
        pages={pages}
        initial={overrides}
        onSubmit={updatePageSeoAction}
      />
    </div>
  );
}
