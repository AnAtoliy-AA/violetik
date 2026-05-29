import type { Metadata } from "next";
import {
  setRequestLocale,
  getTranslations,
  getLocale,
} from "next-intl/server";
import { WelcomePage } from "@/views/welcome";
import { resolveAtelierStatus } from "@/widgets/atelier-hours/lib/resolve-status";
import { WEEKLY_DEFAULT_HOURS } from "@/shared/lib/google-calendar";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Welcome" });
  return { title: `Violetta — ${t("cta_enter")}` };
}

export default async function WelcomeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const status = resolveAtelierStatus(WEEKLY_DEFAULT_HOURS, new Date());

  // Resolve a localized day name for the "opens on" line.
  let opensDayName: string | null = null;
  if (status.state === "closed") {
    const localeBcp = await getLocale();
    // 2026-05-17 is a Sunday — offset by dayOfWeek for a printable label.
    const sample = new Date(2026, 4, 17, 12, 0);
    sample.setDate(sample.getDate() + status.opensAt.dayOfWeek);
    opensDayName = new Intl.DateTimeFormat(localeBcp, {
      weekday: "long",
    }).format(sample);
  }

  return (
    <WelcomePage
      status={
        status.state === "open"
          ? { state: "open", closesAt: status.closesAt }
          : status.state === "closed"
            ? {
                state: "closed",
                day: opensDayName ?? "",
                time: status.opensAt.time,
              }
            : { state: "no-hours" }
      }
    />
  );
}
