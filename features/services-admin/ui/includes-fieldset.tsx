"use client";

import { useTranslations } from "next-intl";

export interface IncludeEntry {
  en: string;
  ru: string;
  by: string;
}

export interface IncludesFieldsetProps {
  items: readonly IncludeEntry[];
  onChange: (next: IncludeEntry[]) => void;
  /** Optional max — defaults to 8 to match the DB CHECK. */
  max?: number;
}

const inputClass =
  "w-full rounded border border-line bg-surface px-2 py-1 text-[13px]";

export function IncludesFieldset({
  items,
  onChange,
  max = 8,
}: IncludesFieldsetProps) {
  const t = useTranslations("AdminServices");

  function update(i: number, locale: keyof IncludeEntry, value: string) {
    const next = items.map((entry, idx) =>
      idx === i ? { ...entry, [locale]: value } : entry,
    );
    onChange(next);
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  function add() {
    if (items.length >= max) return;
    onChange([...items, { en: "", ru: "", by: "" }]);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {t("label_includes")}
      </legend>
      <ul className="flex flex-col gap-2.5">
        {items.map((entry, i) => (
          <li
            key={i}
            className="rounded border-[0.5px] border-line bg-surface p-2.5"
          >
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-[11px] text-text-3">
                <span className="font-mono uppercase tracking-[0.12em]">
                  {t("bullet_en")}
                </span>
                <input
                  type="text"
                  value={entry.en}
                  onChange={(e) => update(i, "en", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-text-3">
                <span className="font-mono uppercase tracking-[0.12em]">
                  {t("bullet_ru")}
                </span>
                <input
                  type="text"
                  value={entry.ru}
                  onChange={(e) => update(i, "ru", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-text-3">
                <span className="font-mono uppercase tracking-[0.12em]">
                  {t("bullet_by")}
                </span>
                <input
                  type="text"
                  value={entry.by}
                  onChange={(e) => update(i, "by", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => remove(i)}
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-3 hover:text-accent"
              >
                {t("cta_remove_bullet")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        disabled={items.length >= max}
        className="self-start font-mono text-[12px] uppercase tracking-[0.16em] text-accent disabled:opacity-50"
      >
        {t("cta_add_bullet")}
      </button>
    </fieldset>
  );
}
