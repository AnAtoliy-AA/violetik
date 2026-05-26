"use client";

import type { ComponentType, SVGProps } from "react";
import { useState } from "react";
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
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Sheet } from "@/shared/ui/sheet";
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
  const close = () => setOpen(false);

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
      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={[0.7, 0.9]}
        title={t("title")}
        description={t("description")}
      >
        <nav aria-label={t("aria_label")} className="mt-2 flex flex-col gap-4">
          <NavList entries={PRIMARY} onSelect={close} t={t} />
          <div aria-hidden className="mx-3 h-px bg-line/60" />
          <NavList entries={VISIT} onSelect={close} t={t} />
        </nav>
      </Sheet>
    </>
  );
}
