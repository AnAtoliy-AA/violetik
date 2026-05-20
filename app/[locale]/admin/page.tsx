import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { PaletteSwitcher } from "@/features/palette-switcher";
import { SignOutButton } from "@/features/telegram-login";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `Violetta — ${t("meta_title")}` };
}

// /admin is the only authenticated route — render it fresh per request
// so the gate picks up env-var changes (TELEGRAM_BOT_TOKEN being set or
// cleared) without a rebuild.
export const dynamic = "force-dynamic";

export default async function AdminRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  // Auth gate is only active when TELEGRAM_BOT_TOKEN is set. Local dev /
  // CI (no token) keep the admin page open so the existing palette
  // tests work without secrets. The gate activates as soon as the env
  // var is populated in any environment.
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  if (AUTH_REQUIRED) {
    const session = await auth();
    if (!session) {
      redirect({ href: "/sign-in", locale });
    }
  }

  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const tSignIn = await getTranslations("SignIn");

  return (
    <div className="pb-16">
      <AppHeader back="/home" title={t("plate_title")} />

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
        <PaletteSwitcher />
        <p className="mt-6 max-w-[420px] font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {t("persistence_note")}
        </p>
      </section>

      {AUTH_REQUIRED ? (
        <section className="border-t-[0.5px] border-line px-[22px] pt-6">
          <SignOutButton label={tSignIn("cta_sign_out")} />
        </section>
      ) : null}
    </div>
  );
}
