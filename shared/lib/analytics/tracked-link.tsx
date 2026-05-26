"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { emitAnalytics } from "./emit";
import type { AnalyticsEventName } from "./event-types";

export interface TrackedLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  event: AnalyticsEventName;
  payload?: Record<string, string | number | boolean>;
  children: ReactNode;
}

/**
 * Locale-aware `<Link>` that emits an analytics event onClick before
 * navigation. Lets server-rendered surfaces tap into the analytics
 * stream without converting the whole tree to a client component.
 */
export function TrackedLink({
  href,
  event,
  payload,
  onClick,
  children,
  ...rest
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        emitAnalytics(event, payload);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
