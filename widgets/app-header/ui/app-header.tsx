import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { StatusBar } from "@/shared/ui/status-bar";
import { Wordmark } from "@/shared/ui/wordmark";

export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  showStatusBar?: boolean;
  menuButton?: ReactNode;
  ariaMenuLabel?: string;
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

export function AppHeader({
  showStatusBar = true,
  menuButton,
  ariaMenuLabel = "Open menu",
  className,
  ...rest
}: AppHeaderProps) {
  const menu = menuButton ?? (
    <button
      type="button"
      aria-label={ariaMenuLabel}
      className={cn(
        "inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
        "transition-colors duration-fast ease-out hover:bg-surface/60",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
    >
      <HamburgerIcon />
    </button>
  );

  return (
    <header className={cn(className)} {...rest}>
      {showStatusBar ? <StatusBar /> : null}
      <div className="flex items-center justify-between px-[22px] pb-2 pt-[10px]">
        <Wordmark size="xs" />
        {menu}
      </div>
    </header>
  );
}
