"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/shared/ui/toast";
import { buttonClassName } from "@/shared/ui/button";

interface CalendarLinkSet {
  apple: string;
  google: string;
  ics: string;
}

export interface ConfirmationExtrasProps {
  calendar?: CalendarLinkSet | null;
  /** Used for the referral copy link. */
  referralUrl?: string | null;
}

/**
 * §6.7 — three small extras under the booking summary on confirmation:
 *   1. Apple / Google / ICS calendar add (chip row)
 *   2. Telegram 24h-reminder opt-in (checkbox)
 *   3. "Bring a friend" copy-referral button
 *
 * Every successful action fires a useToast() confirmation. Inputs are
 * client-local — wiring real persistence (calendar push, reminder
 * delivery, referral redemption) is out of scope for this PR.
 */
export function ConfirmationExtras({
  calendar,
  referralUrl,
}: ConfirmationExtrasProps) {
  const t = useTranslations("Confirmation");
  const { push } = useToast();
  const [remindMe, setRemindMe] = useState(true);

  const handleCalendarTap = (label: string) => () => {
    push({
      intent: "success",
      eyebrow: t("cta_calendar"),
      body: label,
    });
  };

  const copyReferral = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      push({
        intent: "success",
        eyebrow: t("share_eyebrow"),
        body: t("share_copied"),
      });
    } catch {
      push({ intent: "error", body: t("share_eyebrow") });
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-5 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={calendar?.apple ?? "#"}
          aria-disabled={!calendar}
          onClick={handleCalendarTap(t("calendar_apple"))}
          className={buttonClassName({
            variant: "outline",
            size: "sm",
          })}
        >
          {t("calendar_apple")}
        </a>
        <a
          href={calendar?.google ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCalendarTap(t("calendar_google"))}
          className={buttonClassName({
            variant: "outline",
            size: "sm",
          })}
        >
          {t("calendar_google")}
        </a>
        <a
          href={calendar?.ics ?? "#"}
          download
          onClick={handleCalendarTap(t("calendar_ics"))}
          className={buttonClassName({
            variant: "outline",
            size: "sm",
          })}
        >
          {t("calendar_ics")}
        </a>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={remindMe}
          onChange={(e) => setRemindMe(e.target.checked)}
          className="size-4 accent-accent"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-2">
          {t("telegram_remind_eyebrow")}
        </span>
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-3">
          {t("share_eyebrow")}
        </span>
        <button
          type="button"
          onClick={copyReferral}
          disabled={!referralUrl}
          className={buttonClassName({
            variant: "ghost",
            size: "md",
            block: true,
          })}
        >
          {t("share_cta")}
        </button>
      </div>
    </div>
  );
}
