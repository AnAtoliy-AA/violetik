import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Wordmark } from "@/shared/ui/wordmark";
import { TelegramLogin } from "@/features/telegram-login";
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

  return (
    <div className="pb-10">
      <AppHeader back="/welcome" title={t("plate_title")} />

      <main className="flex min-h-[60vh] flex-col items-center justify-center px-[22px] text-center">
        <Wordmark size="sm" className="mb-10" />
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="my-4 max-w-[420px] font-display text-[40px] font-light italic leading-tight tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mb-9 max-w-md text-[14px] leading-relaxed text-text-2">
          {t("paragraph")}
        </p>
        {botUsername ? (
          <TelegramLogin botUsername={botUsername} />
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-3">
            {t("not_configured")}
          </p>
        )}
      </main>
    </div>
  );
}
