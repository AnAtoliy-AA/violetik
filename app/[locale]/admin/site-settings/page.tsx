import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { getSiteSettings } from "@/db/site-settings";
import { listAllServices } from "@/db/services";
import { STUDIO_DATA } from "@/entities/studio";
import { AppHeader } from "@/widgets/app-header";
import {
  SiteSettingsForm,
  updateSiteSettingsAction,
} from "@/features/site-settings-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `Violetta — ${t("site_settings_plate_title")}` };
}

export default async function AdminSiteSettingsRoute({
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
  const [settings, allServices] = await Promise.all([
    getSiteSettings(),
    listAllServices(),
  ]);
  const vipTier = STUDIO_DATA.membership.find((m) => m.tier === "VIP");
  const vipBasePrice = vipTier?.price ?? 0;

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("site_settings_plate_title")} admin />
      <SiteSettingsForm
        initial={settings}
        services={allServices.map((s) => ({
          id: s.id,
          name: s.nameEn,
          basePrice: Math.round(s.priceCents / 100),
        }))}
        vipBasePrice={vipBasePrice}
        onSubmit={updateSiteSettingsAction}
      />
    </div>
  );
}
