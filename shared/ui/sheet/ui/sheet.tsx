"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  type PanInfo,
  motion,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/shared/lib/cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fractions of viewport height the sheet can rest at. Sorted ascending. */
  snapPoints?: ReadonlyArray<number>;
  /** Initial snap index. */
  defaultSnap?: number;
  /** Optional title rendered above the body and used as aria-label. */
  title?: ReactNode;
  /** Optional description rendered under the title. */
  description?: ReactNode;
  /** Hide the drag handle (still draggable). Default false. */
  hideHandle?: boolean;
  children?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onOpenChange,
  snapPoints = [0.45, 0.9],
  defaultSnap = 0,
  title,
  description,
  hideHandle = false,
  children,
}: SheetProps) {
  const [snap, setSnap] = useState(defaultSnap);
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const labelId = useId();
  const reduced = useReducedMotion();

  useEffect(() => {
    // SSR/hydration gate — must flip after mount so the portal target exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    // Reset to default snap whenever the sheet opens (consumer-driven).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnap(defaultSnap);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "Tab") {
        const node = sheetRef.current;
        if (!node) return;
        const focusable = Array.from(
          node.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => !el.hasAttribute("aria-hidden"));
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Move focus into the sheet.
    const id = window.setTimeout(() => {
      const node = sheetRef.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
      lastFocused.current?.focus?.();
    };
  }, [open, defaultSnap, onOpenChange]);

  const sortedSnaps = [...snapPoints].sort((a, b) => a - b);
  const sheetHeight = sortedSnaps[snap] ?? sortedSnaps[0];

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const node = sheetRef.current;
      if (!node) return;
      const viewportH = window.innerHeight;
      const draggedFrac = info.offset.y / viewportH;
      const flickedDown = info.velocity.y > 700;
      const flickedUp = info.velocity.y < -700;

      if (flickedDown && snap === 0) {
        onOpenChange(false);
        return;
      }
      if (flickedDown && snap > 0) {
        setSnap((s) => Math.max(0, s - 1));
        return;
      }
      if (flickedUp && snap < sortedSnaps.length - 1) {
        setSnap((s) => Math.min(sortedSnaps.length - 1, s + 1));
        return;
      }

      // Compute closest snap based on resting position.
      const restingFrac = sheetHeight - draggedFrac;
      if (restingFrac < 0.18) {
        onOpenChange(false);
        return;
      }
      let nearestIndex = 0;
      let nearestDist = Number.POSITIVE_INFINITY;
      sortedSnaps.forEach((sp, i) => {
        const d = Math.abs(sp - restingFrac);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIndex = i;
        }
      });
      setSnap(nearestIndex);
    },
    [onOpenChange, sheetHeight, snap, sortedSnaps],
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          aria-hidden={false}
          className="fixed inset-0 z-[110] flex items-end justify-center"
        >
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-[color:var(--color-scrim)] backdrop-blur-md"
          />
          <motion.div
            key="sheet"
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal
            aria-labelledby={title ? labelId : undefined}
            aria-label={title ? undefined : "Bottom sheet"}
            drag="y"
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={onDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: `${(1 - sheetHeight) * 100}%` }}
            exit={{ y: "100%" }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 30, mass: 0.5 }
            }
            className={cn(
              "relative w-full max-w-[640px] h-[100vh]",
              "bg-surface text-text",
              "rounded-t-2xl shadow-lifted",
              "border-t border-line-strong/60",
              "outline-none flex flex-col",
            )}
            style={{ touchAction: "none" }}
          >
            {!hideHandle && (
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <span
                  aria-hidden
                  className="block h-1 w-10 rounded-full bg-line-strong"
                />
              </div>
            )}
            {(title || description) && (
              <div className="px-5 pt-2 pb-3 shrink-0">
                {title && (
                  <h2
                    id={labelId}
                    className="font-display italic text-2xl text-text"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-text-2 mt-1">{description}</p>
                )}
              </div>
            )}
            <div
              className="flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]"
              style={{ touchAction: "pan-y" }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
