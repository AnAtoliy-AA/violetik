"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";

// Routes that render the bottom <TabBar /> — SiteFooter hides on
// these to avoid overlapping the fixed nav. The credit line still
// reaches users on every other page (welcome, master, admin, etc.).
const TAB_BAR_ROUTES = new Set([
  "/home",
  "/services",
  "/gallery",
  "/profile",
]);

export function SiteFooter() {
  const t = useTranslations("SiteFooter");
  const pathname = usePathname();
  if (TAB_BAR_ROUTES.has(pathname)) return null;

  return (
    <footer className="mt-auto px-[22px] pb-4 pt-6 text-center font-mono text-[9px] uppercase tracking-[0.32em] text-text-3">
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
