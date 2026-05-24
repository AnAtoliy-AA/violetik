"use client";
import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { mergeUsersAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";
import type { OverrideSource } from "@/db/users-admin";

type FieldKey = "firstName" | "lastName" | "email" | "photoUrl";

export interface MergeFormUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  photoUrl: string | null;
}

export interface MergeFormConflicts {
  bothPendingVip: boolean;
  pendingTestimonialCollisions: string[];
}

export interface MergeFormProps {
  a: MergeFormUser;
  b: MergeFormUser;
  conflicts: MergeFormConflicts;
  survivorRadioLabel: string;
  overrideLabels: Record<FieldKey, string>;
  conflictPendingVipLabel: string;
  conflictPendingTestimonialLabel: string;
  mergeLabel: string;
  cancelLabel: string;
  cancelHref: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (input: {
    survivorId: string;
    loserId: string;
    overrides: Record<FieldKey, OverrideSource>;
  }) => void;
}

export function MergeForm(props: MergeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [survivorId, setSurvivorId] = useState(props.a.id);
  const [overrides, setOverrides] = useState<Record<FieldKey, OverrideSource>>({
    firstName: "survivor",
    lastName: "survivor",
    email: "survivor",
    photoUrl: "survivor",
  });

  const survivor = survivorId === props.a.id ? props.a : props.b;
  const loser = survivorId === props.a.id ? props.b : props.a;

  const hasConflict =
    props.conflicts.bothPendingVip ||
    props.conflicts.pendingTestimonialCollisions.length > 0;

  function submit() {
    const payload = {
      survivorId: survivor.id,
      loserId: loser.id,
      overrides,
    };
    if (props.onSubmit) return props.onSubmit(payload);
    startTransition(async () => {
      const r = await mergeUsersAction(payload);
      if (r.ok) {
        router.push(`/admin/users/${encodeURIComponent(r.survivorId)}`);
        router.refresh();
      }
    });
  }

  return (
    <form action={() => submit()} className="flex flex-col gap-6">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {props.survivorRadioLabel}
        </legend>
        {[props.a, props.b].map((u) => (
          <label
            key={u.id}
            className="gilded flex cursor-pointer items-start gap-3 rounded-[14px] p-4"
          >
            <input
              type="radio"
              name="survivor"
              value={u.id}
              checked={survivorId === u.id}
              onChange={() => setSurvivorId(u.id)}
            />
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {u.id}
              </div>
              <div className="font-display text-[18px] italic">
                {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="text-[12px] text-text-2">{u.email ?? "—"}</div>
            </div>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        {(["firstName", "lastName", "email", "photoUrl"] as FieldKey[]).map(
          (field) => (
            <div key={field}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {props.overrideLabels[field]}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-[13px]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={`override-${field}`}
                    checked={overrides[field] === "survivor"}
                    onChange={() =>
                      setOverrides((o) => ({ ...o, [field]: "survivor" }))
                    }
                    aria-label={`${props.overrideLabels[field]} from ${survivor.id}`}
                  />
                  <span className="text-text-2">
                    {survivor[field] ?? "—"}{" "}
                    <span className="text-text-3">({survivor.id})</span>
                  </span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={`override-${field}`}
                    checked={overrides[field] === "loser"}
                    onChange={() =>
                      setOverrides((o) => ({ ...o, [field]: "loser" }))
                    }
                    aria-label={`${props.overrideLabels[field]} from ${loser.id}`}
                  />
                  <span className="text-text-2">
                    {loser[field] ?? "—"}{" "}
                    <span className="text-text-3">({loser.id})</span>
                  </span>
                </label>
              </div>
            </div>
          ),
        )}
      </fieldset>

      {hasConflict ? (
        <ul className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-red-500/50 bg-red-500/10 p-4 text-[13px]">
          {props.conflicts.bothPendingVip ? (
            <li>{props.conflictPendingVipLabel}</li>
          ) : null}
          {props.conflicts.pendingTestimonialCollisions.length > 0 ? (
            <li>{props.conflictPendingTestimonialLabel}</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending || hasConflict}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {props.mergeLabel}
        </button>
        <Link
          href={props.cancelHref}
          className={buttonClassName({ variant: "outline", size: "md" })}
        >
          {props.cancelLabel}
        </Link>
      </div>
    </form>
  );
}
