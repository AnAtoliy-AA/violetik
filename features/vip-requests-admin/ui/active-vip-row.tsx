"use client";
import { useTransition } from "react";
import { downgradeVip } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface ActiveVipRowProps {
  requestId: string;
  downgradeLabel: string;
}

export function ActiveVipDowngradeButton({ requestId, downgradeLabel }: ActiveVipRowProps) {
  const [pending, startTransition] = useTransition();
  return (
    <form action={() => startTransition(async () => { await downgradeVip(requestId); })}>
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "outline", size: "sm" })}
      >
        {downgradeLabel}
      </button>
    </form>
  );
}
