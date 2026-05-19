"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{t("label")}:</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value as (typeof routing.locales)[number];
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        disabled={isPending}
        className="rounded border px-2 py-1 bg-transparent"
        aria-label={t("label")}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
