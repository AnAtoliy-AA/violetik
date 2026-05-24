"use client";

import { useTransition } from "react";
import {
  approveEditRequest,
  approveRemovalRequest,
  rejectEditRequest,
  rejectRemovalRequest,
} from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface ChangeRequestActionsProps {
  testimonialId: string;
  kind: "edit" | "removal";
  approveLabel: string;
  rejectLabel: string;
}

export function ChangeRequestActions({
  testimonialId,
  kind,
  approveLabel,
  rejectLabel,
}: ChangeRequestActionsProps) {
  const [pending, startTransition] = useTransition();
  const approve = kind === "edit" ? approveEditRequest : approveRemovalRequest;
  const reject = kind === "edit" ? rejectEditRequest : rejectRemovalRequest;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        action={() =>
          startTransition(async () => {
            await approve(testimonialId);
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
            await reject(testimonialId);
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
