import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { listAllCategories, listAllServices } from "@/db/services";
import { getServiceIdsHavingAnyPublishedMaster } from "@/db/masters";
import {
  AdminServicesList,
  reorderCategoriesAction,
  reorderServicesAction,
} from "@/features/services-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminServices" });
  return { title: `Violetta — ${t("plate_title")}` };
}

export default async function AdminServicesRoute({
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
  const t = await getTranslations("AdminServices");

  const [categories, services, eligible] = await Promise.all([
    listAllCategories(),
    listAllServices(),
    getServiceIdsHavingAnyPublishedMaster(),
  ]);
  // Mirror listPublishedServices()'s real hiding rule, including the
  // zero-masters fall-through: when no master is published anywhere, the
  // menu shows everything, so nothing is "hidden".
  const hiddenServiceIds =
    eligible.size === 0
      ? []
      : services
          .filter((s) => s.status === "published" && !eligible.has(s.id))
          .map((s) => s.id);

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />
      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>
      <AdminServicesList
        categories={categories}
        services={services}
        hiddenServiceIds={hiddenServiceIds}
        reorderCategoriesAction={reorderCategoriesAction}
        reorderServicesAction={reorderServicesAction}
      />
    </div>
  );
}
