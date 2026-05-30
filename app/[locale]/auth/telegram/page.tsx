import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Aurora } from "@/shared/ui/aurora";
import { Wordmark } from "@/shared/ui/wordmark";
import { TelegramAuthCallback } from "@/features/telegram-login";

type Params = { locale: string };
type Search = { callbackUrl?: string };

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Telegram Login Widget redirect target. The widget (in redirect mode —
 * see features/telegram-login) sends the browser here with the signed
 * payload as query params; <TelegramAuthCallback> reads them and calls
 * signIn("telegram", …). Redirect mode avoids the `'unsafe-eval'` that
 * callback mode's `data-onauth` parsing would otherwise require in the
 * CSP.
 */
export default async function TelegramAuthPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { callbackUrl } = await searchParams;
  const t = await getTranslations("SignIn");

  return (
    <div className="relative overflow-hidden">
      <Aurora intensity="vivid" />
      <main className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-[22px] text-center">
        <Wordmark size="sm" className="mb-8" />
        <p
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-3"
          aria-live="polite"
        >
          {t("signing_in")}
        </p>
        <TelegramAuthCallback
          callbackUrl={callbackUrl ?? `/${locale}/profile`}
        />
      </main>
    </div>
  );
}
