import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { getUserDetail, suggestMergeCandidates } from "@/db/users-admin";
import {
  RoleToggle,
  AdminNoteForm,
  VipGrantForm,
  VipRevokeButton,
  SuggestedMerges,
  type SuggestedMergeRow,
} from "@/features/users-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminUsers" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function displayName(u: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  id: string;
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.username || u.email || u.id;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminUserDetailRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id: rawId } = await params;
  // User ids contain a literal colon ("tg:12345", "google:<sub>") which is
  // a reserved URL char. We encode on emit (see /admin/users list) so the
  // segment travels safely; Next decodes it once before handing it to us,
  // but defensively decode again in case the param arrives still encoded.
  const id = rawId.includes("%") ? decodeURIComponent(rawId) : rawId;
  setRequestLocale(locale);

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  const user = await getUserDetail(id);
  if (!user) notFound();

  const t = await getTranslations("AdminUsers");
  const tDetail = await getTranslations("AdminUsers.detail");

  const suggestions = await suggestMergeCandidates({ scope: "for", userId: id });
  const dupRows: SuggestedMergeRow[] = suggestions.map((c) => ({
    a: { id: c.a.id, displayName: displayName(c.a), photoUrl: c.a.photoUrl },
    b: { id: c.b.id, displayName: displayName(c.b), photoUrl: c.b.photoUrl },
    score: c.score,
    signals: c.signals,
  }));

  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="pb-16">
      <AppHeader back="/admin/users" title={displayName(user)} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{tDetail("section_identity")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[32px] font-light italic">
          {displayName(user)}
        </h1>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {user.id}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-text-2">
          {user.telegramId !== null ? (
            <span>
              Telegram · @{user.username ?? "—"} (tg:{user.telegramId})
            </span>
          ) : null}
          {user.googleSub !== null ? (
            <span>Google · {user.email ?? "—"}</span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-text-3">
          <span>
            {tDetail("identity_created", { date: isoDate(user.createdAt) })}
          </span>
          <span>
            {user.lastSignInAt
              ? tDetail("identity_last_seen", {
                  date: isoDate(user.lastSignInAt),
                })
              : t("last_seen_never")}
          </span>
        </div>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_role")}
        </h2>
        <RoleToggle
          userId={user.id}
          role={user.role}
          customerLabel={t("role_customer")}
          adminLabel={t("role_admin")}
          lastAdminErrorLabel={t("role_last_admin_error")}
        />
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_note")}
        </h2>
        <AdminNoteForm
          userId={user.id}
          initialNote={user.adminNote}
          helperLabel={tDetail("note_only_admin")}
          saveLabel={tDetail("note_save")}
          savedLabel={tDetail("note_saved")}
        />
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_vip")}
        </h2>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          {user.vipState === "lifetime"
            ? t("vip_state_lifetime")
            : user.vipState === "active"
              ? t("vip_state_active", { date: isoDate(user.vipExpiresAt!) })
              : t("vip_state_member")}
        </div>
        {user.vipState === "none" ? (
          <VipGrantForm
            userId={user.id}
            defaultExpiry={defaultExpiry}
            untilLabel={tDetail("vip_grant_until")}
            noExpiryLabel={tDetail("vip_grant_no_expiry")}
            grantLabel={tDetail("vip_grant_cta")}
          />
        ) : (
          <VipRevokeButton
            userId={user.id}
            label={tDetail("vip_revoke_cta")}
          />
        )}
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_bookings")}
        </h2>
        <div className="text-[13px] text-text-2">
          {tDetail("bookings_count", { n: user.bookingCount })}
        </div>
        <Link
          href="/admin/bookings"
          className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
        >
          {tDetail("bookings_link")}
        </Link>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {tDetail("section_testimonials")}
        </h2>
        <div className="flex gap-4 text-[13px] text-text-2">
          <span>
            {tDetail("testimonials_pending", { n: user.testimonialPendingCount })}
          </span>
          <span>
            {tDetail("testimonials_approved", {
              n: user.testimonialApprovedCount,
            })}
          </span>
        </div>
      </section>

      {dupRows.length > 0 ? (
        <SuggestedMerges
          title={tDetail("section_duplicates")}
          reviewLabel={t("review_merge")}
          signalLabels={{
            email: t("signal_email"),
            photo: t("signal_photo"),
            name: t("signal_name"),
            "tg-google-handle": t("signal_handle"),
          }}
          candidates={dupRows}
        />
      ) : (
        <section className="px-[22px] pb-6">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {tDetail("section_duplicates")}
          </h2>
          <p className="text-[13px] text-text-3">{tDetail("duplicates_empty")}</p>
        </section>
      )}
    </div>
  );
}
