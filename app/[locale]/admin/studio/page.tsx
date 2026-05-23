import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { getSiteSettings } from "@/db/site-settings";
import { AppHeader } from "@/widgets/app-header";
import {
  StudioForm,
  updateStudioAction,
} from "@/features/studio-admin";
import { COUNTRIES } from "@/shared/config/countries";
import { getTimeZoneList } from "@/shared/config/time-zones";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminStudio" });
  return { title: `Violetta — ${t("plate_title")}` };
}

export default async function AdminStudioRoute({
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

  const t = await getTranslations("AdminStudio");
  const settings = await getSiteSettings();

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />
      <StudioForm
        initial={settings}
        countries={COUNTRIES}
        timeZones={getTimeZoneList()}
        onSubmit={updateStudioAction}
      />
    </div>
  );
}
