"use client";

import { useTranslations } from "next-intl";

interface ServiceOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface Props {
  services: readonly ServiceOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
}

export function SpecialtyPicker({ services, value, onChange }: Props) {
  const t = useTranslations("AdminMasters");
  const selected = new Set(value);

  // Group services by categoryId, preserving input order.
  const groups = new Map<
    string,
    { name: string; services: ServiceOption[] }
  >();
  for (const s of services) {
    if (!groups.has(s.categoryId)) {
      groups.set(s.categoryId, { name: s.categoryName, services: [] });
    }
    groups.get(s.categoryId)!.services.push(s);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }
  function selectAll(ids: string[]) {
    const next = new Set(selected);
    for (const id of ids) next.add(id);
    onChange([...next]);
  }
  function clearGroup(ids: string[]) {
    const next = new Set(selected);
    for (const id of ids) next.delete(id);
    onChange([...next]);
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {t("label_specialties")}
      </legend>
      <p className="text-[11px] text-text-3">{t("label_specialties_hint")}</p>
      {selected.size === 0 ? (
        <p className="text-[12px] text-rose" role="alert">
          {t("specialties_empty_warning")}
        </p>
      ) : null}
      {[...groups.entries()].map(([catId, group]) => {
        const ids = group.services.map((s) => s.id);
        return (
          <div key={catId} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-2">
                {group.name}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded px-1 py-1 text-[10px] uppercase tracking-[0.16em] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  onClick={() => selectAll(ids)}
                >
                  {t("specialties_select_all")}
                </button>
                <button
                  type="button"
                  className="rounded px-1 py-1 text-[10px] uppercase tracking-[0.16em] text-text-3 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  onClick={() => clearGroup(ids)}
                >
                  {t("specialties_clear")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.services.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-[13px] text-text-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
