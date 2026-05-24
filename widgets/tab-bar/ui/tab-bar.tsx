"use client";

import type { ComponentType, SVGProps } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  Home as HomeIcon,
  Menu as MenuIcon,
  Image as ImageIcon,
  User as UserIcon,
  Shield as ShieldIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";

type TabKey = "home" | "services" | "gallery" | "profile" | "admin";

interface Tab {
  key: TabKey;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const BASE_TABS: readonly Tab[] = [
  { key: "home", href: "/home", Icon: HomeIcon },
  { key: "services", href: "/services", Icon: MenuIcon },
  { key: "gallery", href: "/gallery", Icon: ImageIcon },
  { key: "profile", href: "/profile", Icon: UserIcon },
];

const ADMIN_TAB: Tab = { key: "admin", href: "/admin", Icon: ShieldIcon };

function activeTabKey(pathname: string, tabs: readonly Tab[]): TabKey {
  // The /admin tab stays active on every nested admin route.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  // Services keeps the tab bar active on the catalog page, not on the
  // detail page (/services/[id]) where the spec explicitly omits the bar.
  for (const tab of tabs) {
    if (pathname === tab.href) return tab.key;
  }
  return "home";
}

export interface TabBarProps {
  /** Show the admin tab — set by the route after resolving session role. */
  showAdmin?: boolean;
}

export function TabBar({ showAdmin = false }: TabBarProps = {}) {
  const t = useTranslations("TabBar");
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const tabs = showAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const active = activeTabKey(pathname, tabs);

  return (
    <nav
      aria-label={t("aria_label")}
      className="fixed bottom-[22px] left-1/2 z-40 w-full max-w-[420px] -translate-x-1/2 px-4 pb-3 pt-2"
    >
      <ul
        className={cn(
          "glass-top relative flex items-center justify-around",
          "h-14 rounded-full border-[0.5px] border-line-strong bg-bg-2/70 shadow-card",
        )}
        style={{
          backdropFilter: "var(--backdrop-blur-lg)",
          WebkitBackdropFilter: "var(--backdrop-blur-lg)",
        }}
      >
        {tabs.map(({ key, href, Icon }) => {
          const isActive = key === active;
          return (
            <li key={key} className="relative">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center rounded-full px-5 py-2",
                  "transition-[color,opacity] duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  isActive
                    ? "text-text opacity-100"
                    : "text-text-3 opacity-50 hover:text-text-2 hover:opacity-100",
                )}
              >
                {isActive ? (
                  <>
                    <motion.span
                      layoutId="tab-thumb"
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full bg-surface-2"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 380, damping: 32 }
                      }
                    />
                    <motion.span
                      aria-hidden
                      className="gilded pointer-events-none absolute inset-0 rounded-full"
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.32,
                        ease: [0.22, 1, 0.36, 1],
                        delay: reduceMotion ? 0 : 0.1,
                      }}
                    />
                  </>
                ) : null}
                <span className="relative flex flex-col items-center gap-0.5">
                  <Icon
                    aria-hidden
                    width={18}
                    height={18}
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em]">
                    {t(`${key}.label`)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
