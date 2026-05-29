"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { buttonClassName } from "@/shared/ui/button";

export interface MergePickerOption {
  id: string;
  displayName: string;
}

export interface MergePickerProps {
  userId: string;
  options: MergePickerOption[];
  placeholderLabel: string;
  mergeWithLabel: string;
  emptyLabel: string;
  /** Test seam — bypasses navigation. */
  onSubmit?: (otherId: string) => void;
}

export function MergePicker(props: MergePickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("");

  if (props.options.length === 0) {
    return (
      <p className="text-[13px] text-text-3">{props.emptyLabel}</p>
    );
  }

  function go() {
    if (!selected) return;
    if (props.onSubmit) return props.onSubmit(selected);
    router.push(
      `/admin/users/${encodeURIComponent(props.userId)}/merge/${encodeURIComponent(selected)}`,
    );
  }

  return (
    <form
      action={() => go()}
      className="flex flex-wrap items-center gap-3"
    >
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="min-w-[200px] flex-1 rounded-[10px] border-[0.5px] border-line bg-surface-1 px-3 py-2.5 text-base text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <option value="">{props.placeholderLabel}</option>
        {props.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.displayName} · {o.id}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!selected}
        className={buttonClassName({ variant: "gold", size: "sm" })}
      >
        {props.mergeWithLabel}
      </button>
    </form>
  );
}
