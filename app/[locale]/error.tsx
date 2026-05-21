"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Aurora } from "@/shared/ui/aurora";
import { buttonClassName } from "@/shared/ui/button";
import { Eyebrow } from "@/shared/ui/eyebrow";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Editorial error boundary for the locale segment. Next.js renders this
 * when a server- or client-side render throws inside `app/[locale]/…`.
 * Mirrors the visual language of `not-found.tsx`.
 */
export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations("Error");

  useEffect(() => {
    // Next strips the message in production; the digest links to the
    // server log entry. Surface it to the console so the on-call has
    // something to grep for.
    if (error.digest) {
      console.error("[error boundary] digest:", error.digest);
    } else {
      console.error("[error boundary]", error);
    }
  }, [error]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-[22px] text-center">
      <Aurora intensity="subtle" />
      <Eyebrow gold>{t("plate")}</Eyebrow>
      <h1 className="my-5 max-w-[420px] font-display text-[44px] font-light italic leading-[1.04] tracking-[-0.02em]">
        {t.rich("title", { br: () => <br /> })}
      </h1>
      <p className="max-w-md text-[14px] leading-relaxed text-text-2">
        {t("paragraph")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className={buttonClassName({ variant: "gold" })}
        >
          {t("cta_retry")}
        </button>
        <Link
          href="/welcome"
          className={buttonClassName({ variant: "outline" })}
        >
          {t("cta_home")}
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.32em] text-text-3">
          {t("digest_label")} · {error.digest}
        </p>
      ) : null}
    </main>
  );
}
