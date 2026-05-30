"use client";

import {
  forwardRef,
  useId,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/cn";
import { GlassSurface } from "@/shared/ui/glass-surface";

export interface FloatingInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  /** Mono eyebrow label that morphs to italic eyebrow on focus. */
  label: string;
  /** Optional hint shown under the input. */
  hint?: string;
  /** Optional error text — turns the underline rose-accent. */
  error?: string;
}

/**
 * A studio-grade input: mono eyebrow label that morphs to italic eyebrow
 * on focus/value, with a gilded underline that draws on focus.
 *
 * Wrapped in GlassSurface (tint="body"→"warm" on focus, blur="md", rim,
 * elevation={1}). The rim ::before is always rendered; only its opacity
 * transitions via --rim-opacity (0 → 1 on focus).
 *
 * Standalone — no story file (covered by Vitest, the rest is decoration).
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput(
    {
      label,
      hint,
      error,
      className,
      id: idProp,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const reactId = useId();
    const id = idProp ?? `floating-input-${reactId}`;

    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(() => {
      if (value !== undefined) return String(value).length > 0;
      if (defaultValue !== undefined) return String(defaultValue).length > 0;
      return false;
    });

    const elevated = focused || hasValue;

    return (
      <GlassSurface
        tint={focused ? "warm" : "body"}
        blur="md"
        rim
        elevation={1}
        className={cn(
          "relative rounded-md px-3 pt-3 pb-1.5 transition-colors duration-fast ease-out",
          className,
        )}
        style={{ "--rim-opacity": focused ? 1 : 0 } as CSSProperties}
      >
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-3 origin-left transition-all duration-fast ease-out",
            "select-none",
            elevated
              ? "top-1 font-display text-[12px] italic text-accent"
              : "top-1/2 -translate-y-1/2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3",
          )}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? `${id}-error`
              : hint
                ? `${id}-hint`
                : undefined
          }
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setHasValue(event.target.value.length > 0);
            onChange?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "block w-full bg-transparent px-0 pb-2 pt-5 text-[15px] text-text outline-none",
            "border-b border-line transition-colors duration-fast ease-out",
            "focus:border-accent",
            error && "border-rose",
          )}
          {...rest}
        />
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-rose"
          >
            {error}
          </p>
        ) : hint ? (
          <p
            id={`${id}-hint`}
            className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3"
          >
            {hint}
          </p>
        ) : null}
      </GlassSurface>
    );
  },
);
