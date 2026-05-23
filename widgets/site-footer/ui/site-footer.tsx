import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  return (
    <footer className="sticky bottom-0 z-40 mt-auto bg-bg/85 px-[22px] pb-4 pt-6 text-center font-mono text-[9px] uppercase tracking-[0.32em] text-text-3 backdrop-blur">
      {t("credit_prefix")}{" "}
      <a
        href="https://arcadeum.games"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Arcadeum Games Studio
      </a>
    </footer>
  );
}
