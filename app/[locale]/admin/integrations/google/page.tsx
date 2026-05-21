import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  ConnectButton,
  ConnectionStatus,
} from "@/features/google-calendar-connect";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminGoogle" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function AdminGoogleRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const session = await auth();
    if (!session) redirect({ href: "/sign-in", locale });
  }

  setRequestLocale(locale);
  const t = await getTranslations("AdminGoogle");
  const token = await getActiveGoogleToken();
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("meta_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">
          {t("hero_paragraph")}
        </p>
      </section>

      <section className="px-[22px] pt-2 pb-10">
        {!configured ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
            {t("not_configured")}
          </p>
        ) : token ? (
          <ConnectionStatus
            email={token.email}
            connectedAt={token.connectedAt}
            disconnectLabel={t("status_disconnect")}
            connectedLabel={t("status_connected")}
          />
        ) : (
          <ConnectButton label={t("cta_connect")} />
        )}
      </section>
    </div>
  );
}
