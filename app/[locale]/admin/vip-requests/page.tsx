import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  listPendingVipRequests,
  listActiveVips,
  listExpiredVipRequests,
  countExpiredVipRequests,
} from "@/db/vip-requests";
import {
  RequestActions,
  ActiveVipDowngradeButton,
  ExpiredRowMeta,
} from "@/features/vip-requests-admin";
import { requireAdmin } from "@/shared/lib/auth-server";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminVipRequests" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function customerLabel(r: {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
  userId: string;
}): string {
  const name = [r.userFirstName, r.userLastName].filter(Boolean).join(" ");
  return name || r.userEmail || r.username || r.userId;
}

function isoPlusDays(n: number): string {
  return new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
}

function daysFromNow(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 86400_000);
}

export default async function AdminVipRequestsRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const t = await getTranslations("AdminVipRequests");
  const [pending, active, expired, totalExpired] = await Promise.all([
    listPendingVipRequests(),
    listActiveVips(),
    listExpiredVipRequests({ limit: 10, offset: 0 }),
    countExpiredVipRequests(),
  ]);

  const defaultExpiry = isoPlusDays(30);

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("meta_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">{t("hero_paragraph")}</p>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_pending", { n: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_pending")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((r) => (
              <li key={r.id} className="gilded rounded-[18px] p-5">
                <div className="font-display text-[20px] italic">{customerLabel(r)}</div>
                {r.note ? (
                  <p className="mt-1 italic text-[13px] text-text-2">&ldquo;{r.note}&rdquo;</p>
                ) : null}
                <div className="mt-3">
                  <RequestActions
                    requestId={r.id}
                    defaultExpiry={defaultExpiry}
                    approveLabel={t("cta_approve")}
                    declineLabel={t("cta_decline")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_active", { n: active.length })}
        </h2>
        {active.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_active")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((r) => (
              <li key={r.id} className="gilded rounded-[18px] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[20px] italic">{customerLabel(r)}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {t("expires_in_days", { n: daysFromNow(r.expiresAt!) })}
                  </div>
                </div>
                <div className="mt-3">
                  <ActiveVipDowngradeButton
                    requestId={r.id}
                    downgradeLabel={t("cta_downgrade")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_expired", { shown: expired.length, total: totalExpired })}
        </h2>
        {expired.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_expired")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {expired.map((r) => (
              <li key={r.id} className="gilded rounded-[12px] px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[16px] italic">{customerLabel(r)}</div>
                  <ExpiredRowMeta
                    expiredAt={r.expiresAt!}
                    expiredAtLabel={t("expired_ago_days", {
                      n: Math.abs(daysFromNow(r.expiresAt!)),
                    })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {totalExpired > expired.length ? (
          <div className="mt-3">
            <Link
              href="/admin/vip-requests/expired"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
            >
              {t("cta_show_all_expired", { total: totalExpired })} →
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
