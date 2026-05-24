"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  NOTIFICATION_CATEGORIES,
  ADMIN_CATEGORIES,
  type NotificationCategory,
} from "@/shared/lib/notifications/types";
import { cn } from "@/shared/lib/cn";
import { toggleCategoryAction } from "../api/actions";
import { EnablePushButton } from "./enable-push-button";

export interface NotificationSettingsProps {
  isAdmin: boolean;
  initialPreferences: Partial<Record<NotificationCategory, boolean>>;
  vapidPublicKey: string;
}

export function NotificationSettings({
  isAdmin,
  initialPreferences,
  vapidPublicKey,
}: NotificationSettingsProps) {
  const t = useTranslations("Notifications");
  const [prefs, setPrefs] =
    useState<Partial<Record<NotificationCategory, boolean>>>(initialPreferences);
  const [, startTransition] = useTransition();

  const visible = NOTIFICATION_CATEGORIES.filter(
    (c) => isAdmin || !ADMIN_CATEGORIES.has(c),
  );

  const toggle = (c: NotificationCategory) => {
    const next = !(prefs[c] ?? false);
    setPrefs((prev) => ({ ...prev, [c]: next }));
    startTransition(() => {
      void toggleCategoryAction(c, next);
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl">{t("page_title")}</h1>
        <p className="text-text-2">{t("intro")}</p>
      </header>

      <EnablePushButton vapidPublicKey={vapidPublicKey} />

      <ul className="flex flex-col gap-3">
        {visible.map((c) => {
          const checked = prefs[c] === true;
          return (
            <li
              key={c}
              className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface/40 px-4 py-3"
            >
              <span className="text-text">{t(`category_${c}_label`)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={t(`category_${c}_label`)}
                onClick={() => toggle(c)}
                className={cn(
                  "h-6 w-11 rounded-full border border-line transition-colors",
                  checked ? "bg-accent" : "bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "block h-5 w-5 rounded-full bg-bg transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
