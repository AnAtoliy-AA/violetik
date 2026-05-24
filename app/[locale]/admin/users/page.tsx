import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import {
  listUsers,
  countUsers,
  suggestMergeCandidates,
  USERS_PAGE_SIZE,
  type RoleFilter,
  type VipFilter,
} from "@/db/users-admin";
import {
  RoleToggle,
  SuggestedMerges,
  type SuggestedMergeRow,
} from "@/features/users-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };
type Search = {
  q?: string;
  role?: string;
  vip?: string;
  page?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminUsers" });
  return { title: `Violetta — ${t("meta_title")}` };
}

function parseRole(raw: string | undefined): RoleFilter {
  return raw === "admin" || raw === "customer" ? raw : "all";
}
function parseVip(raw: string | undefined): VipFilter {
  return raw === "active" || raw === "none" ? raw : "all";
}
function parsePage(raw: string | undefined): number {
  const n = Number(raw ?? "1");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
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

export default async function AdminUsersRoute({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  const q = (search.q ?? "").trim();
  const role = parseRole(search.role);
  const vip = parseVip(search.vip);
  const page = parsePage(search.page);

  const [users, total, suggestions] = await Promise.all([
    listUsers({ q, role, vip, page }),
    countUsers({ q, role, vip }),
    suggestMergeCandidates({ scope: "all" }),
  ]);

  const t = await getTranslations("AdminUsers");

  const suggestRows: SuggestedMergeRow[] = suggestions.slice(0, 5).map((c) => ({
    a: {
      id: c.a.id,
      displayName: displayName(c.a),
      photoUrl: c.a.photoUrl,
    },
    b: {
      id: c.b.id,
      displayName: displayName(c.b),
      photoUrl: c.b.photoUrl,
    },
    score: c.score,
    signals: c.signals,
  }));

  const from = (page - 1) * USERS_PAGE_SIZE + (users.length === 0 ? 0 : 1);
  const to = (page - 1) * USERS_PAGE_SIZE + users.length;

  const baseQuery = (overrides: Record<string, string>): string => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (role !== "all") sp.set("role", role);
    if (vip !== "all") sp.set("vip", vip);
    if (page > 1) sp.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "" || v === "all" || v === "1") sp.delete(k);
      else sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />

      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("hero_title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">{t("hero_paragraph")}</p>
      </section>

      <SuggestedMerges
        title={t("section_suggested_merges")}
        reviewLabel={t("review_merge")}
        signalLabels={{
          email: t("signal_email"),
          photo: t("signal_photo"),
          name: t("signal_name"),
          "tg-google-handle": t("signal_handle"),
        }}
        candidates={suggestRows}
      />

      <section className="px-[22px] pb-4">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("search_placeholder")}
            className="min-w-[200px] flex-1 rounded-[10px] border-[0.5px] border-line bg-surface-1 px-3 py-2 text-[13px]"
          />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="vip" value={vip} />
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "admin", "customer"] as RoleFilter[]).map((r) => (
            <Link
              key={r}
              href={`/admin/users${baseQuery({ role: r, page: "1" })}`}
              className={`rounded-full border-[0.5px] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                role === r ? "border-gold text-gold" : "border-line text-text-3"
              }`}
            >
              {t(`filter_role_${r}` as const)}
            </Link>
          ))}
          {(["all", "active", "none"] as VipFilter[]).map((v) => (
            <Link
              key={v}
              href={`/admin/users${baseQuery({ vip: v, page: "1" })}`}
              className={`rounded-full border-[0.5px] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                vip === v ? "border-gold text-gold" : "border-line text-text-3"
              }`}
            >
              {t(`filter_vip_${v}` as const)}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-[22px] pb-6">
        {users.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_list")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {users.map((u) => (
              <li key={u.id} className="gilded rounded-[12px] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/admin/users/${encodeURIComponent(u.id)}`}
                    className="min-w-[200px] flex-1"
                  >
                    <div className="font-display text-[18px] italic">
                      {displayName(u)}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                      {u.id} ·{" "}
                      {u.vipState === "lifetime"
                        ? t("vip_state_lifetime")
                        : u.vipState === "active"
                          ? t("vip_state_active", {
                              date: u.vipExpiresAt!.toISOString().slice(0, 10),
                            })
                          : t("vip_state_member")}
                    </div>
                  </Link>
                  <RoleToggle
                    userId={u.id}
                    role={u.role}
                    customerLabel={t("role_customer")}
                    adminLabel={t("role_admin")}
                    lastAdminErrorLabel={t("role_last_admin_error")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between text-[12px] text-text-3">
          <span>{t("pagination_summary", { from, to, total })}</span>
          <span className="flex gap-3">
            {page > 1 ? (
              <Link href={`/admin/users${baseQuery({ page: String(page - 1) })}`}>
                {t("pagination_prev")}
              </Link>
            ) : null}
            {to < total ? (
              <Link href={`/admin/users${baseQuery({ page: String(page + 1) })}`}>
                {t("pagination_next")}
              </Link>
            ) : null}
          </span>
        </div>
      </section>
    </div>
  );
}
