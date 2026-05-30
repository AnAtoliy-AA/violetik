import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Aurora } from "@/shared/ui/aurora";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Wordmark } from "@/shared/ui/wordmark";
import { TelegramLogin } from "@/features/telegram-login";
import { GoogleSignInButton } from "@/features/google-sign-in";
import { AppHeader } from "@/widgets/app-header";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SignIn" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function SignInPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("SignIn");
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const eitherConfigured = Boolean(botUsername) || googleEnabled;

  return (
    <div className="relative overflow-hidden pb-10">
      <Aurora intensity="vivid" />
      <AppHeader back="/welcome" title={t("plate_title")} />

      <main className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-[22px] text-center">
        <Wordmark size="sm" className="mb-10" />
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="my-4 max-w-[420px] font-display text-[40px] font-light italic leading-tight tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mb-9 max-w-md text-[14px] leading-relaxed text-text-2">
          {t("paragraph")}
        </p>

        {!eitherConfigured ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-3">
            {t("not_configured")}
          </p>
        ) : (
          <div className="flex w-full max-w-xs flex-col items-center gap-5">
            {googleEnabled ? (
              <GoogleSignInButton label={t("cta_google")} />
            ) : null}

            {googleEnabled && botUsername ? (
              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-3">
                  {t("divider_or")}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
            ) : null}

            {botUsername ? (
              <TelegramLogin
                botUsername={botUsername}
                authPath={`/${locale}/auth/telegram`}
                callbackUrl={`/${locale}/profile`}
              />
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
