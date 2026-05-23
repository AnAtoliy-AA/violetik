"use client";

import { useTransition } from "react";
import { approveTestimonial, rejectTestimonial } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface DecisionActionsProps {
  testimonialId: string;
  approveLabel: string;
  rejectLabel: string;
}

export function DecisionActions({
  testimonialId,
  approveLabel,
  rejectLabel,
}: DecisionActionsProps) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        action={() =>
          startTransition(async () => {
            await approveTestimonial(testimonialId);
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName({ variant: "gold", size: "sm" })}
        >
          {approveLabel}
        </button>
      </form>
      <form
        action={() =>
          startTransition(async () => {
            await rejectTestimonial(testimonialId);
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {rejectLabel}
        </button>
      </form>
    </div>
  );
}
