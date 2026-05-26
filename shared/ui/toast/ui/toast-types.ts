import type { ReactNode } from "react";

export type ToastIntent = "info" | "success" | "warn" | "error";

export interface ToastInput {
  eyebrow?: ReactNode;
  body: ReactNode;
  intent?: ToastIntent;
  /** Duration in ms before auto-dismiss. Default 4500. 0 = sticky. */
  duration?: number;
  /** Optional id; auto-generated if omitted. */
  id?: string;
}

export interface ToastInstance extends ToastInput {
  id: string;
  intent: ToastIntent;
}
