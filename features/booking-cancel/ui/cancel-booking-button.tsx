"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import type { CancelBookingResult } from "../api/cancel-booking-action";

export interface CancelBookingButtonProps {
  bookingId: string;
  action: (bookingId: string) => Promise<CancelBookingResult>;
  className?: string;
}

export function CancelBookingButton({
  bookingId,
  action,
  className,
}: CancelBookingButtonProps) {
  const t = useTranslations("Profile");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (!result.ok) {
        setError(t("cancel_error"));
      }
    });
  };

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(buttonClassName({ variant: "outline", size: "sm" }))}
      >
        {pending ? t("cancel_confirming") : t("cancel_button")}
      </button>
      {error ? (
        <p role="alert" className="text-[12px] text-text-3">
          {error}
        </p>
      ) : null}
    </div>
  );
}
