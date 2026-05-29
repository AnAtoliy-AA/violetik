"use client";

import { useTranslations } from "next-intl";

export interface MasterOption {
  id: string;
  name: string;
}

interface Props {
  masters: readonly MasterOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
}

/**
 * Service-side master linking. Flat checkbox list (masters aren't
 * categorized). The inverse of masters-admin's SpecialtyPicker. The
 * empty-state hint is informational, not blocking — a service can be
 * published without masters; the admin list flags it separately.
 */
export function MasterPicker({ masters, value, onChange }: Props) {
  const t = useTranslations("AdminServices");
  const selected = new Set(value);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {t("label_masters")}
      </legend>
      <p className="text-[11px] text-text-3">{t("label_masters_hint")}</p>
      {masters.length === 0 ? (
        <p className="text-[12px] text-text-2">{t("masters_none")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {masters.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-2 text-[13px] text-text-2"
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
              />
              {m.name}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
