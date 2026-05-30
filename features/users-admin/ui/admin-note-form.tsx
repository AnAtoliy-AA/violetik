"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { setAdminNoteAction } from "../api/actions";
import { buttonClassName } from "@/shared/ui/button";

export interface AdminNoteFormProps {
  userId: string;
  initialNote: string | null;
  helperLabel: string;
  saveLabel: string;
  savedLabel: string;
  /** Test seam — bypasses the server action. */
  onSubmit?: (note: string | null) => void;
}

export function AdminNoteForm(props: AdminNoteFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(props.initialNote ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function submit(): void {
    const next = value.trim() === "" ? null : value;
    if (props.onSubmit) {
      props.onSubmit(next);
      setSavedAt(Date.now());
      return;
    }
    startTransition(async () => {
      const result = await setAdminNoteAction(props.userId, next);
      if (result.ok) {
        setSavedAt(Date.now());
        router.refresh();
      }
    });
  }

  return (
    <form action={() => submit()} className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full rounded-[12px] border-[0.5px] border-line bg-surface-1 p-3 text-base text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {props.helperLabel}
        </span>
        <div className="flex items-center gap-3">
          {savedAt !== null ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              {props.savedLabel}
            </span>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={buttonClassName({ variant: "gold", size: "sm" })}
          >
            {props.saveLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
