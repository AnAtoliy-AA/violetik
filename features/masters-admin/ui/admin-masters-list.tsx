"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SortableList } from "./sortable-list";

// §2 — padded ≥44px hit area + focus ring for the row/header navigation links.
const actionLink =
  "inline-flex min-h-[44px] items-center rounded px-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent";

export type ReorderAction = (
  ids: string[],
) => Promise<{ ok: true } | { ok: false; error: string }>;

interface MasterRow {
  id: string;
  name: string;
  role: string;
  status: "draft" | "published" | "archived";
  serviceCount: number;
}

export interface AdminMastersListProps {
  masters: readonly MasterRow[];
  reorderMastersAction: ReorderAction;
}

export function AdminMastersList({
  masters,
  reorderMastersAction,
}: AdminMastersListProps) {
  const t = useTranslations("AdminMasters");
  const [, startReorder] = useTransition();

  // Non-archived are reorderable; archived are read-only listing.
  const active = masters.filter((m) => m.status !== "archived");
  const archived = masters.filter((m) => m.status === "archived");
  const activeKey = active.map((m) => m.id).join("|");

  return (
    <div className="flex flex-col gap-10 px-[22px] py-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {t("section_published")}
          </h2>
          <Link href="/admin/masters/new" className={actionLink}>
            {t("cta_new")}
          </Link>
        </div>
        {active.length === 0 ? (
          <p className="text-[12px] text-text-3">{t("empty_published")}</p>
        ) : (
          <SortableList
            key={activeKey}
            items={active}
            dragLabel={t("section_published")}
            onReorder={(ids) => {
              startReorder(async () => {
                await reorderMastersAction(ids);
              });
            }}
            renderRow={(m) => (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-[18px] italic">
                    {m.name}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                    {m.role} ·{" "}
                    {t("specialties_count", { count: m.serviceCount })} ·{" "}
                    {m.status === "published"
                      ? t("status_published")
                      : t("status_draft")}
                  </div>
                </div>
                <Link href={`/admin/masters/${m.id}`} className={actionLink}>
                  {t("cta_edit")}
                </Link>
              </div>
            )}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_archived")}
        </h2>
        {archived.length === 0 ? (
          <p className="text-[12px] text-text-3">{t("empty_archived")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {archived.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border-[0.5px] border-line bg-surface p-3"
              >
                <div>
                  <div className="font-display text-[18px] italic text-text-2 line-through">
                    {m.name}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                    {m.role}
                  </div>
                </div>
                <Link href={`/admin/masters/${m.id}`} className={actionLink}>
                  {t("cta_restore")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
