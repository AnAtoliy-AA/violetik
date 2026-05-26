"use client";

import type { ComponentType, SVGProps } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  Home as HomeIcon,
  Menu as MenuIcon,
  CalendarHeart as CalendarIcon,
  Sparkles as MastersIcon,
  Image as GalleryIcon,
  Gem as MembershipIcon,
  User as ProfileIcon,
  Bell as NotificationsIcon,
  X as CloseIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";

interface NavEntry {
  key: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const PRIMARY: readonly NavEntry[] = [
  { key: "home", href: "/home", Icon: HomeIcon },
  { key: "services", href: "/services", Icon: MenuIcon },
  { key: "gallery", href: "/gallery", Icon: GalleryIcon },
  { key: "masters", href: "/master", Icon: MastersIcon },
  { key: "membership", href: "/membership", Icon: MembershipIcon },
];

const VISIT: readonly NavEntry[] = [
  { key: "book", href: "/booking/service", Icon: CalendarIcon },
  { key: "profile", href: "/profile", Icon: ProfileIcon },
  { key: "notifications", href: "/profile/notifications", Icon: NotificationsIcon },
];

const triggerClass = cn(
  "inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
  "transition-colors duration-fast ease-out hover:bg-surface/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
);

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function HamburgerIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
    >
      <path d="M6 8h12M6 12h12M6 16h8" />
    </svg>
  );
}

function NavList({
  entries,
  onSelect,
  t,
}: {
  entries: readonly NavEntry[];
  onSelect: () => void;
  t: (key: string) => string;
}) {
  return (
    <ul className="flex flex-col">
      {entries.map(({ key, href, Icon }) => (
        <li key={key}>
          <Link
            href={href}
            onClick={onSelect}
            className={cn(
              "flex items-center gap-4 rounded-xl px-3 py-3",
              "text-text transition-colors duration-fast ease-out",
              "hover:bg-surface-2/60",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            )}
          >
            <span
              aria-hidden
              className="inline-flex size-9 items-center justify-center rounded-full border-[0.5px] border-line text-text-2"
            >
              <Icon width={16} height={16} strokeWidth={1.5} />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.32em]">
              {t(`${key}.label`)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NavSheet() {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const labelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const close = () => setOpen(false);

  useEffect(() => {
    // SSR-safe portal target gate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const id = window.setTimeout(() => {
      const node = panelRef.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
      lastFocused.current?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t("trigger_label")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={triggerClass}
      >
        <HamburgerIcon />
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                aria-hidden={false}
                className="fixed inset-0 z-[110]"
              >
                <m.div
                  key="scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: reduced ? 0 : 0.22,
                    ease: "easeOut",
                  }}
                  onClick={close}
                  className="absolute inset-0 bg-[color:var(--color-scrim)] backdrop-blur-md"
                />
                <m.div
                  key="panel"
                  ref={panelRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal
                  aria-labelledby={labelId}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 360, damping: 34, mass: 0.6 }
                  }
                  className={cn(
                    "absolute right-0 top-0 h-full w-[min(360px,86vw)]",
                    "bg-surface text-text shadow-lifted",
                    "border-l border-line-strong/60",
                    "outline-none flex flex-col",
                    "pt-[max(20px,env(safe-area-inset-top))]",
                    "pb-[max(20px,env(safe-area-inset-bottom))]",
                  )}
                >
                  <div className="flex items-start justify-between px-5 pb-3">
                    <div>
                      <h2
                        id={labelId}
                        className="font-display italic text-2xl text-text"
                      >
                        {t("title")}
                      </h2>
                      <p className="mt-1 text-sm text-text-2">
                        {t("description")}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("close_label")}
                      onClick={close}
                      className={cn(
                        "shrink-0 inline-flex size-9 items-center justify-center rounded-full border-[0.5px] border-line text-text-2",
                        "transition-colors duration-fast ease-out hover:text-text hover:bg-surface-2/60",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                      )}
                    >
                      <CloseIcon width={16} height={16} strokeWidth={1.5} />
                    </button>
                  </div>
                  <nav
                    aria-label={t("aria_label")}
                    className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pt-2"
                  >
                    <NavList entries={PRIMARY} onSelect={close} t={t} />
                    <div aria-hidden className="mx-3 h-px bg-line/60" />
                    <NavList entries={VISIT} onSelect={close} t={t} />
                  </nav>
                </m.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
