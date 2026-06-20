import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { NavSheet } from "@/widgets/nav-sheet";
import { cn } from "@/shared/lib/cn";
import { Wordmark } from "@/shared/ui/wordmark";
import { GlassSurface } from "@/shared/ui/glass-surface";

export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  /** If set, replaces the default Wordmark with a centred mono caps title. */
  title?: string;
  /** If set, replaces the wordmark slot with a round back-arrow Link to this locale-aware href. */
  back?: string;
  /** A11y label for the default back arrow. */
  ariaBackLabel?: string;
  /** Slot to override the right-hand menu button entirely. */
  menuButton?: ReactNode;
  /**
   * When true, an inline mono eyebrow `· ADMIN ·` is rendered next to the
   * wordmark / back arrow. Used on every `/admin/*` route.
   */
  admin?: boolean;
  /** Extra controls rendered in the right zone, before the nav menu. */
  actions?: ReactNode;
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
  "relative inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
  // Visible glyph stays 38px; a `before` pseudo extends the tap target to
  // ~46px so the chrome buttons clear the 44px touch-target minimum on mobile.
  "before:absolute before:-inset-1 before:content-['']",
  "transition-colors duration-fast ease-out hover:bg-surface/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
);

export function AppHeader({
  title,
  back,
  ariaBackLabel = "Go back",
  menuButton,
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

  const menu = menuButton ?? <NavSheet />;

  return (
    <GlassSurface
      as="header"
      tint="warm"
      blur="xl"
      elevation={2}
      className={cn(
        "sticky top-0 z-40 transition-[backdrop-filter] duration-300",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-2 px-[22px] pb-2.5 pt-[10px]">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {left}
          {admin ? (
            <span
              data-testid="app-header-admin"
              className="font-mono text-[9px] uppercase tracking-[0.32em] text-text-3"
            >
              <span aria-hidden className="sm:hidden">·</span>
              <span aria-hidden className="hidden sm:inline">· ADMIN ·</span>
              <span className="sr-only sm:hidden">Admin</span>
            </span>
          ) : null}
        </div>
        {title ? (
          <span className="min-w-0 flex-1 truncate text-center font-mono text-[9px] uppercase tracking-[0.32em] text-text-2">
            {title}
          </span>
        ) : (
          <span aria-hidden className="flex-1" />
        )}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actions}
          {menu}
        </div>
      </div>
      {admin ? (
        <div
          aria-hidden
          className="mx-[22px] h-px bg-line-strong"
        />
      ) : null}
    </GlassSurface>
  );
}
