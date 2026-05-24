import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { getUserDetail, getMergeConflicts } from "@/db/users-admin";
import { MergeForm } from "@/features/users-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string; otherId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminUsers" });
  return { title: `Violetta — ${t("merge.meta_title")}` };
}

export default async function AdminUsersMergeRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id: rawId, otherId: rawOther } = await params;
  // User ids carry a literal colon — see the [id] page for the rationale.
  const id = rawId.includes("%") ? decodeURIComponent(rawId) : rawId;
  const otherId = rawOther.includes("%")
    ? decodeURIComponent(rawOther)
    : rawOther;
  setRequestLocale(locale);

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  if (id === otherId) notFound();

  const [a, b] = await Promise.all([getUserDetail(id), getUserDetail(otherId)]);
  if (!a || !b) notFound();

  const conflicts = await getMergeConflicts(a.id, b.id);
  const t = await getTranslations("AdminUsers");
  const tMerge = await getTranslations("AdminUsers.merge");

  return (
    <div className="pb-16">
      <AppHeader
        back={`/admin/users/${encodeURIComponent(id)}`}
        title={tMerge("plate_title")}
        admin
      />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[32px] font-light italic">
          {tMerge("plate_title")}
        </h1>
        <p className="max-w-[480px] text-[13px] text-text-2">{tMerge("intro")}</p>
      </section>

      <section className="px-[22px] pb-10">
        <MergeForm
          a={{
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
            photoUrl: a.photoUrl,
          }}
          b={{
            id: b.id,
            firstName: b.firstName,
            lastName: b.lastName,
            email: b.email,
            photoUrl: b.photoUrl,
          }}
          conflicts={conflicts}
          survivorRadioLabel={tMerge("survivor_label")}
          overrideLabels={{
            firstName: tMerge("override_first_name"),
            lastName: tMerge("override_last_name"),
            email: tMerge("override_email"),
            photoUrl: tMerge("override_photo"),
          }}
          conflictPendingVipLabel={tMerge("conflict_pending_vip")}
          conflictPendingTestimonialLabel={tMerge("conflict_pending_testimonial")}
          mergeLabel={tMerge("cta_merge")}
          cancelLabel={tMerge("cta_cancel")}
          cancelHref={`/admin/users/${encodeURIComponent(id)}`}
        />
      </section>
    </div>
  );
}
