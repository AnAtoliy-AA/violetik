import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { loadMastersForLocale } from "@/entities/master/api/load";
import {
  AdminMastersList,
  reorderMastersAction,
} from "@/features/masters-admin";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminMasters" });
  return { title: `Violetta — ${t("plate_title")}` };
}

export default async function AdminMastersRoute({
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
  const t = await getTranslations("AdminMasters");

  const masters = await loadMastersForLocale(locale as Locale);
  const rows = masters.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    status: m.status,
    serviceCount: m.serviceIds.length,
  }));

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />
      <section className="px-[22px] py-6">
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("plate_title")}
        </h1>
      </section>
      <AdminMastersList
        masters={rows}
        reorderMastersAction={reorderMastersAction}
      />
    </div>
  );
}
