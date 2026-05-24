"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { setUserRoleAction } from "../api/actions";
import { cn } from "@/shared/lib/cn";

export interface RoleToggleProps {
  userId: string;
  role: "customer" | "admin";
  customerLabel: string;
  adminLabel: string;
  lastAdminErrorLabel: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (role: "customer" | "admin") => void;
}

export function RoleToggle(props: RoleToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(props.role);

  function submit(next: "customer" | "admin") {
    if (props.onSubmit) {
      props.onSubmit(next);
      setCurrent(next);
      return;
    }
    startTransition(async () => {
      const result = await setUserRoleAction(props.userId, next);
      if (!result.ok) {
        if (result.reason === "last-admin") setError(props.lastAdminErrorLabel);
        return;
      }
      setError(null);
      setCurrent(next);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Role"
      className="inline-flex items-center rounded-full border-[0.5px] border-line bg-surface-1 p-0.5 text-[11px]"
    >
      {(["customer", "admin"] as const).map((value) => {
        const label = value === "customer" ? props.customerLabel : props.adminLabel;
        const checked = current === value;
        return (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={checked}
            aria-label={label}
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              if (!checked) submit(value);
            }}
            className={cn(
              "rounded-full px-3 py-1 font-mono uppercase tracking-[0.18em] transition-colors duration-fast",
              checked ? "bg-gold text-bg" : "text-text-2",
            )}
          >
            {label}
          </button>
        );
      })}
      {error ? (
        <span className="ml-2 text-[10px] text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
