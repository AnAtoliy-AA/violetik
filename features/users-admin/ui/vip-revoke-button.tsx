"use client";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { revokeVipAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface VipRevokeButtonProps {
  userId: string;
  label: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: () => void;
}

export function VipRevokeButton(props: VipRevokeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={() => {
        if (props.onSubmit) return props.onSubmit();
        startTransition(async () => {
          const r = await revokeVipAction(props.userId);
          if (r.ok) router.refresh();
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "outline", size: "sm" })}
      >
        {props.label}
      </button>
    </form>
  );
}
