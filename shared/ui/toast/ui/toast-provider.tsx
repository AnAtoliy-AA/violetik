"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Toast } from "./toast";
import type { ToastInput, ToastInstance } from "./toast-types";

interface ToastContextValue {
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be called inside <ToastProvider>");
  }
  return ctx;
}

let counter = 0;
const nextId = () => `t-${Date.now()}-${++counter}`;

interface ToastProviderProps {
  children: ReactNode;
  /** Max toasts on screen; older ones drop. Default 3. */
  limit?: number;
}

export function ToastProvider({ children, limit = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const reduced = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const dismissAll = useCallback(() => {
    timers.current.forEach((h) => clearTimeout(h));
    timers.current.clear();
    setToasts([]);
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? nextId();
      const instance: ToastInstance = {
        ...input,
        id,
        intent: input.intent ?? "info",
      };
      setToasts((prev) => {
        const next = [...prev, instance];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
      const ms = input.duration ?? 4500;
      if (ms > 0) {
        const handle = setTimeout(() => dismiss(id), ms);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss, limit],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((h) => clearTimeout(h));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ push, dismiss, dismissAll }),
    [push, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-[120] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <m.div
              key={toast.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.2 } }
              }
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto"
            >
              <Toast toast={toast} onDismiss={dismiss} />
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
