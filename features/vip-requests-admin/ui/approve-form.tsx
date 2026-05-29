"use client";
import { useState, useTransition } from "react";
import { approveRequest } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface ApproveFormProps {
  requestId: string;
  defaultExpiry: string;
  approveLabel: string;
}

export function ApproveForm({ requestId, defaultExpiry, approveLabel }: ApproveFormProps) {
  const [date, setDate] = useState(defaultExpiry);
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() =>
        startTransition(async () => {
          await approveRequest({
            id: requestId,
            expiresAt: new Date(`${date}T23:59:59Z`),
          });
        })
      }
      className="flex items-center gap-2"
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border-[0.5px] border-line bg-transparent px-3 py-2 text-base text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      />
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "gold", size: "sm" })}
      >
        {approveLabel}
      </button>
    </form>
  );
}
