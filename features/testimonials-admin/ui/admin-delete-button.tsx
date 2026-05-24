"use client";

import { useState, useTransition } from "react";
import { adminDeleteTestimonial } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface AdminDeleteButtonProps {
  testimonialId: string;
  deleteLabel: string;
  confirmLabel: string;
  cancelLabel: string;
}

export function AdminDeleteButton({
  testimonialId,
  deleteLabel,
  confirmLabel,
  cancelLabel,
}: AdminDeleteButtonProps) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClassName({ variant: "outline", size: "sm" })}
      >
        {deleteLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await adminDeleteTestimonial(testimonialId);
            setConfirming(false);
          })
        }
        className={buttonClassName({ variant: "gold", size: "sm" })}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className={buttonClassName({ variant: "ghost", size: "sm" })}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
