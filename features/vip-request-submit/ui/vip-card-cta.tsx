"use client";

import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";
import { submitVipRequest, cancelVipRequest } from "../api/actions";

export type VipCardCtaState =
  | { kind: "visitor"; locale: string }
  | { kind: "member" }
  | { kind: "pending" }
  | { kind: "vip"; expiresAt: Date | null };

export interface VipCardCtaProps {
  state: VipCardCtaState;
  labels: {
    signIn: string;
    join: string;
    cancel: string;
    youreVip: string;
  };
}

export function VipCardCta({ state, labels }: VipCardCtaProps) {
  const [pending, startTransition] = useTransition();

  if (state.kind === "visitor") {
    return (
      <Link
        href={`/sign-in?next=/membership`}
        className={buttonClassName({ variant: "gold", size: "md", block: true })}
      >
        {labels.signIn}
      </Link>
    );
  }

  if (state.kind === "member") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => submitVipRequest({ note: null }).then(() => {}))}
        className={buttonClassName({ variant: "gold", size: "md", block: true })}
      >
        {labels.join}
      </button>
    );
  }

  if (state.kind === "pending") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => cancelVipRequest().then(() => {}))}
        className={buttonClassName({ variant: "outline", size: "md", block: true })}
      >
        {labels.cancel}
      </button>
    );
  }

  return (
    <span
      className={buttonClassName({ variant: "outline", size: "md", block: true })}
      aria-disabled
    >
      {labels.youreVip}
    </span>
  );
}
