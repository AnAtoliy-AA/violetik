"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import {
  EMPTY_PAGE_SEO_ENTRY,
  type PageSeoEntry,
  type PageSeoId,
  type PageSeoOverrides,
  type PageSeoPatch,
} from "@/entities/page-seo";
import { buttonClassName } from "@/shared/ui/button";

export type SubmitFn = (
  patch: PageSeoPatch,
) => Promise<{ ok: true } | { ok: false; error: string }>;

/** Localized translation default shown as the input placeholder. */
export type LocaleDefaults = Record<Locale, { title: string; description: string }>;

export interface PageSeoDescriptor {
  id: PageSeoId;
  /** Human-friendly page name (already translated). */
  label: string;
  /** Route path, e.g. "/home". */
  path: string;
  defaults: LocaleDefaults;
}

export interface PageSeoFormProps {
  pages: PageSeoDescriptor[];
  initial: PageSeoOverrides;
  onSubmit: SubmitFn;
}

type FormState = Record<string, PageSeoEntry>;

type Status =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

const TITLE_FIELD: Record<Locale, keyof PageSeoEntry> = {
  en: "titleEn",
  ru: "titleRu",
  by: "titleBy",
};
const DESCRIPTION_FIELD: Record<Locale, keyof PageSeoEntry> = {
  en: "descriptionEn",
  ru: "descriptionRu",
  by: "descriptionBy",
};

export function PageSeoForm({ pages, initial, onSubmit: submit }: PageSeoFormProps) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [state, setState] = useState<FormState>(() => {
    const next: FormState = {};
    for (const page of pages) {
      // Prefill each field with the stored override when present, else the
      // translation default for that locale, so the admin edits the actual
      // effective value instead of an empty box. Required inputs then keep
      // the fields from being submitted blank.
      const stored = initial[page.id];
      const entry = { ...EMPTY_PAGE_SEO_ENTRY };
      for (const l of routing.locales) {
        const loc = l as Locale;
        const storedTitle = stored?.[TITLE_FIELD[loc]];
        const storedDescription = stored?.[DESCRIPTION_FIELD[loc]];
        entry[TITLE_FIELD[loc]] =
          storedTitle && storedTitle.trim() ? storedTitle : page.defaults[loc].title;
        entry[DESCRIPTION_FIELD[loc]] =
          storedDescription && storedDescription.trim()
            ? storedDescription
            : page.defaults[loc].description;
      }
      next[page.id] = entry;
    }
    return next;
  });

  function setField(id: string, field: keyof PageSeoEntry, value: string) {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setStatus({ kind: "idle" });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    const patch: PageSeoPatch = {
      entries: pages.map((page) => ({ id: page.id, ...state[page.id] })),
    };
    startTransition(async () => {
      const result = await submit(patch);
      setStatus(
        result.ok
          ? { kind: "saved" }
          : { kind: "error", message: result.error },
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 px-[22px] py-6">
      <p className="max-w-[460px] text-[13px] text-text-2">
        {t("page_seo_intro")}
      </p>

      {pages.map((page) => {
        const entry = state[page.id];
        return (
          <fieldset
            key={page.id}
            className="rounded-[18px] border-[0.5px] border-line p-4"
          >
            <legend className="flex items-center gap-2 px-1">
              <span className="font-display text-[16px] italic">{page.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                {page.path}
              </span>
            </legend>

            <div className="mt-2 flex flex-col gap-5">
              {routing.locales.map((l) => (
                <div key={l} className="flex flex-col gap-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                    {l.toUpperCase()}
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-text-2">
                      {t("page_seo_title_label")}
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={70}
                      placeholder={page.defaults[l].title}
                      aria-label={`${page.label} ${l.toUpperCase()} ${t("page_seo_title_label")}`}
                      className="rounded border border-line bg-surface px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      value={entry[TITLE_FIELD[l]]}
                      onChange={(ev) => setField(page.id, TITLE_FIELD[l], ev.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-text-2">
                      {t("page_seo_description_label")}
                    </span>
                    <textarea
                      rows={2}
                      required
                      maxLength={200}
                      placeholder={page.defaults[l].description}
                      aria-label={`${page.label} ${l.toUpperCase()} ${t("page_seo_description_label")}`}
                      className="rounded border border-line bg-surface px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      value={entry[DESCRIPTION_FIELD[l]]}
                      onChange={(ev) =>
                        setField(page.id, DESCRIPTION_FIELD[l], ev.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="sticky bottom-0 z-10 -mx-[22px] flex items-center gap-3 border-t-[0.5px] border-line bg-surface/95 px-[22px] py-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("page_seo_save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("page_seo_saved")}
          </span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-rose">
            {t("page_seo_error", { error: status.message })}
          </span>
        ) : null}
      </div>
    </form>
  );
}
