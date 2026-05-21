import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { requireAdmin } from "@/shared/lib/auth-server";
import { listExpiredVipRequests, countExpiredVipRequests } from "@/db/vip-requests";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

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

function daysFromNow(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 86400_000);
}

export default async function ExpiredVipRequestsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageRaw } = await searchParams;
  setRequestLocale(locale);

  const gate = await requireAdmin();
  if (!gate.ok) redirect({ href: "/sign-in", locale });

  const t = await getTranslations("AdminVipRequests");

  const page = Math.max(1, Number(pageRaw) || 1);
  const [rows, total] = await Promise.all([
    listExpiredVipRequests({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countExpiredVipRequests(),
  ]);

  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  return (
    <div className="pb-16">
      <AppHeader back="/admin/vip-requests" title={t("expired_page_title")} />

      <section className="px-[22px] py-6">
        <h1 className="mb-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("expired_page_title")}
        </h1>
      </section>

      <section className="px-[22px] pb-6">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_expired", { shown: rows.length, total })}
        </h2>
        {rows.length === 0 ? (
          <p className="text-[13px] text-text-3">{t("empty_expired")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded-[12px] border-[0.5px] border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-[16px] italic">{customerLabel(r)}</div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                    {t("expired_ago_days", { n: Math.abs(daysFromNow(r.expiresAt!)) })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(hasPrev || hasNext) ? (
        <div className="flex items-center gap-4 px-[22px]">
          {hasPrev ? (
            <a
              href={`?page=${page - 1}`}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
            >
              ← Prev
            </a>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              ← Prev
            </span>
          )}
          <span className="font-mono text-[11px] text-text-3">{page}</span>
          {hasNext ? (
            <a
              href={`?page=${page + 1}`}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
            >
              Next →
            </a>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              Next →
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
