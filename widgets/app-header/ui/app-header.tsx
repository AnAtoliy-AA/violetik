import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/features/locale-switcher";
import { PwaInstallButton } from "@/features/pwa-install";
import { cn } from "@/shared/lib/cn";
import { Wordmark } from "@/shared/ui/wordmark";

export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  /** If set, replaces the default Wordmark with a centred mono caps title. */
  title?: string;
  /** If set, replaces the wordmark slot with a round back-arrow Link to this locale-aware href. */
  back?: string;
  /** A11y label for the default back arrow. */
  ariaBackLabel?: string;
  /** Slot to override the right-hand menu button entirely. */
  menuButton?: ReactNode;
  /** A11y label for the default hamburger button. */
  ariaMenuLabel?: string;
  /**
   * When true, an inline mono eyebrow `· ADMIN ·` is rendered next to the
   * wordmark / back arrow. Used on every `/admin/*` route.
   */
  admin?: boolean;
  /** Extra controls rendered in the right zone, before LocaleSwitcher. */
  actions?: ReactNode;
}

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

function BackIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

const circleButtonClass = cn(
  "inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
  "transition-colors duration-fast ease-out hover:bg-surface/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
);

export function AppHeader({
  title,
  back,
  ariaBackLabel = "Go back",
  menuButton,
  ariaMenuLabel = "Open menu",
  admin = false,
  actions,
  className,
  ...rest
}: AppHeaderProps) {
  const left = back ? (
    <Link
      href={back}
      aria-label={ariaBackLabel}
      className={circleButtonClass}
    >
      <BackIcon />
    </Link>
  ) : (
    <Link
      href="/home"
      className="-m-2 rounded-sm p-2 transition-opacity duration-fast ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <Wordmark size="sm" animated />
    </Link>
  );

  const menu = menuButton ?? (
    <button
      type="button"
      aria-label={ariaMenuLabel}
      className={circleButtonClass}
    >
      <HamburgerIcon />
    </button>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-bg/85 backdrop-blur",
        className,
      )}
      {...rest}
    >
      <div className="relative flex items-center justify-between px-[22px] pb-2 pt-[10px]">
        <div className="flex items-center gap-3">
          {left}
          {admin ? (
            <span
              data-testid="app-header-admin"
              className="font-mono text-[9px] uppercase tracking-[0.32em] text-text-2"
            >
              · ADMIN ·
            </span>
          ) : null}
        </div>
        {title ? (
          <span className="pointer-events-none absolute inset-x-0 text-center font-mono text-[9px] uppercase tracking-[0.32em] text-text-2">
            {title}
          </span>
        ) : null}
        <div className="flex items-center gap-2">
          {actions}
          <PwaInstallButton />
          <LocaleSwitcher />
          {menu}
        </div>
      </div>
      {admin ? (
        <div
          aria-hidden
          className="mx-[22px] mt-1 h-px bg-line-strong"
        />
      ) : null}
    </header>
  );
}
