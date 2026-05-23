import { getTranslations, getLocale } from "next-intl/server";
import { STUDIO_DATA } from "@/entities/studio";
import { Aurora } from "@/shared/ui/aurora";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { AppHeader } from "@/widgets/app-header";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { VipCardCta, type VipCardCtaState } from "@/features/vip-request-submit";
import { formatLongDate } from "@/views/booking/lib/booking-steps";
import { MembershipPageClient } from "./membership-page-client";

export async function MembershipPage() {
  const t = await getTranslations("Membership");
  const locale = await getLocale();

  const user = await getCurrentSessionUser();
  const tier = user ? await getCurrentTier(user.id) : null;

  const vipState: VipCardCtaState =
    !user
      ? { kind: "visitor", locale }
      : tier?.state === "vip"
        ? { kind: "vip", expiresAt: tier.expiresAt }
        : tier?.state === "member-pending"
          ? { kind: "pending" }
          : { kind: "member" };

  const cardLabels = {
    signIn: t("cta_sign_in"),
    join: t("cta_join_vip"),
    cancel: t("cta_cancel_request"),
    youreVip:
      tier?.state === "vip"
        ? t("cta_youre_vip", {
            date: formatLongDate(
              tier.expiresAt.toISOString().slice(0, 10),
              locale,
            ),
          })
        : t("cta_youre_vip", { date: "" }),
  };

  return (
    <div className="pb-10">
      <AppHeader back="/home" title={t("plate_title")} />

      <section className="relative overflow-hidden px-[22px] pb-4 pt-3">
        <Aurora intensity="subtle" />
        <PaperGrain />
        <div className="relative z-10">
          <Eyebrow gold>{t("eyebrow")}</Eyebrow>
          <h1 className="my-2.5 mt-3 font-display text-h1 font-normal leading-tight tracking-[-0.02em]">
            {t.rich("hero_title", { em: (c) => <em>{c}</em> })}
          </h1>
          <LetterpressRule className="mt-3 max-w-[440px]" />
          <p className="dropcap m-0 mt-4 max-w-[540px] text-[14px] text-text-2">
            {t("hero_paragraph")}
          </p>
        </div>
      </section>

      <MembershipPageClient
        tiers={STUDIO_DATA.membership}
        settings={await getSiteSettingsServer()}
        labels={{
          billingAria: t("billing_aria"),
          billingMonthly: t("billing_monthly"),
          billingAnnual: t("billing_annual"),
          priceFree: t("price_free"),
          cadenceMonth: t("cadence_month"),
          cadenceYear: t("cadence_year"),
          ctaStayFree: t("cta_stay_free"),
          ctaJoinByTier: Object.fromEntries(
            STUDIO_DATA.membership.map((m) => [
              m.tier,
              t("cta_join", { tier: m.tier }),
            ]),
          ),
          mostChosen: t("most_chosen"),
        }}
        vipCardCta={<VipCardCta state={vipState} labels={cardLabels} />}
      />

      <section className="px-[22px] pb-10 pt-2.5 text-center">
        <p className="mx-auto m-0 max-w-[280px] text-[12px] text-text-3">
          {t("footnote")}
        </p>
      </section>
    </div>
  );
}
