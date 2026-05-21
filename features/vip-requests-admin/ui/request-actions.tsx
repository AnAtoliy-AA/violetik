"use client";
import { useTransition } from "react";
import { declineRequest } from "../api/actions";
import { ApproveForm } from "./approve-form";
import { buttonClassName } from "@/shared/ui/button";

export interface RequestActionsProps {
  requestId: string;
  defaultExpiry: string;
  approveLabel: string;
  declineLabel: string;
}

export function RequestActions(props: RequestActionsProps) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ApproveForm
        requestId={props.requestId}
        defaultExpiry={props.defaultExpiry}
        approveLabel={props.approveLabel}
      />
      <form
        action={() =>
          startTransition(async () => {
            await declineRequest({ id: props.requestId });
          })
        }
      >
        <button
          type="submit"
          disabled={pending}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {props.declineLabel}
        </button>
      </form>
    </div>
  );
}
