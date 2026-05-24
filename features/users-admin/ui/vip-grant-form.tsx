"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { grantVipAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface VipGrantFormProps {
  userId: string;
  defaultExpiry: string; // YYYY-MM-DD
  untilLabel: string;
  noExpiryLabel: string;
  grantLabel: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (input: { expiresAt: string | null }) => void;
}

export function VipGrantForm(props: VipGrantFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expiry, setExpiry] = useState(props.defaultExpiry);
  const [noExpiry, setNoExpiry] = useState(false);

  function submit() {
    const isoOrNull = noExpiry ? null : expiry;
    if (props.onSubmit) {
      props.onSubmit({ expiresAt: isoOrNull });
      return;
    }
    startTransition(async () => {
      const result = await grantVipAction({
        userId: props.userId,
        expiresAt: isoOrNull ? new Date(`${isoOrNull}T23:59:59Z`) : null,
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <form action={() => submit()} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {props.untilLabel}
        </span>
        <input
          type="date"
          value={expiry}
          disabled={noExpiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="rounded-[10px] border-[0.5px] border-line bg-surface-1 px-3 py-2 text-[13px]"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={noExpiry}
          onChange={(e) => setNoExpiry(e.target.checked)}
        />
        {props.noExpiryLabel}
      </label>
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "gold", size: "sm" })}
      >
        {props.grantLabel}
      </button>
    </form>
  );
}
