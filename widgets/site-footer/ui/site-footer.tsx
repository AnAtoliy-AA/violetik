import { useTranslations } from "next-intl";

// Thin always-visible credit strip pinned to viewport bottom. On pages
// that also mount <TabBar />, the TabBar is offset upward to clear
// this strip (see widgets/tab-bar/ui/tab-bar.tsx).
export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30">
      <div className="h-px bg-gradient-to-r from-transparent via-line-strong/40 to-transparent" />
      <div className="bg-bg/85 backdrop-blur-md px-[22px] py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
        {t("credit_prefix")}{" "}
        <a
          href="https://arcadeum.games"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-text-2 underline-offset-2 transition-colors duration-fast ease-out hover:text-accent hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Arcadeum Games Studio
        </a>
      </div>
    </footer>
  );
}
