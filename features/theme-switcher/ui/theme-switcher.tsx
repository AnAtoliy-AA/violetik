"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("ThemeSwitcher");
  const [mounted, setMounted] = useState(false);

  // Avoids hydration mismatch: theme is unknown on the server, only readable after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{t("label")}:</span>
      <select
        value={mounted ? theme ?? "system" : "system"}
        onChange={(e) => setTheme(e.target.value)}
        disabled={!mounted}
        className="rounded border px-2 py-1 bg-transparent"
        aria-label={t("label")}
      >
        <option value="system">{t("system")}</option>
        <option value="light">{t("light")}</option>
        <option value="dark">{t("dark")}</option>
      </select>
    </label>
  );
}
