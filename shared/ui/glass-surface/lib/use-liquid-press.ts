"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseLiquidPressOptions {
  /** If true, only updates --lx/--ly on press, not on hover. Default false. */
  pressOnly?: boolean;
  /** If true, sets data-active during the press. Default true. */
  setDataActive?: boolean;
}

export interface UseLiquidPressReturn {
  pressed: boolean;
}

export function useLiquidPress(
  ref: RefObject<HTMLElement | null>,
  options: UseLiquidPressOptions = {},
): UseLiquidPressReturn {
  const { pressOnly = false, setDataActive = true } = options;
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const writeCoords = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const lx = ((e.clientX - rect.left) / rect.width) * 100;
      const ly = ((e.clientY - rect.top) / rect.height) * 100;
      node.style.setProperty("--lx", `${lx}%`);
      node.style.setProperty("--ly", `${ly}%`);
    };

    const onMove = (e: PointerEvent) => {
      if (pressOnly && !pressedRef.current) return;
      writeCoords(e);
    };
    const onDown = (e: PointerEvent) => {
      writeCoords(e);
      if (setDataActive) node.setAttribute("data-active", "true");
      pressedRef.current = true;
      setPressed(true);
    };
    const clear = () => {
      if (setDataActive) node.removeAttribute("data-active");
      pressedRef.current = false;
      setPressed(false);
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointerup", clear);
    node.addEventListener("pointercancel", clear);
    node.addEventListener("pointerleave", clear);

    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("pointerup", clear);
      node.removeEventListener("pointercancel", clear);
      node.removeEventListener("pointerleave", clear);
    };
  }, [ref, pressOnly, setDataActive]);

  return { pressed };
}
