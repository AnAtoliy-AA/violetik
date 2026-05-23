import { useTranslations } from "next-intl";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  DecisionActions,
  TestimonialRow,
  type TestimonialRowLabels,
} from "@/features/testimonials-admin";
import type { AdminTestimonialRow } from "@/db/testimonials";
import type { Locale } from "@/i18n/routing";

export interface AdminTestimonialsPageProps {
  locale: Locale;
  pending: readonly AdminTestimonialRow[];
  approved: readonly AdminTestimonialRow[];
  rejected: readonly AdminTestimonialRow[];
}

export function AdminTestimonialsPage({
  locale,
  pending,
  approved,
  rejected,
}: AdminTestimonialsPageProps) {
  const t = useTranslations("AdminTestimonials");
  const labels: TestimonialRowLabels = {
    submittedAt: t("submitted_at"),
    decidedAt: t("decided_at"),
    statusPending: t("status_pending"),
    statusApproved: t("status_approved"),
    statusRejected: t("status_rejected"),
  };
  const approveLabel = t("cta_approve");
  const rejectLabel = t("cta_reject");

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

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_pending", { n: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_pending")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((row) => (
              <TestimonialRow
                key={row.id}
                row={row}
                locale={locale}
                labels={labels}
                decisionSlot={
                  <DecisionActions
                    testimonialId={row.id}
                    approveLabel={approveLabel}
                    rejectLabel={rejectLabel}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_approved", { n: approved.length })}
        </h2>
        {approved.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_approved")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {approved.map((row) => (
              <TestimonialRow
                key={row.id}
                row={row}
                locale={locale}
                labels={labels}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_rejected", { n: rejected.length })}
        </h2>
        {rejected.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_rejected")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rejected.map((row) => (
              <TestimonialRow
                key={row.id}
                row={row}
                locale={locale}
                labels={labels}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
