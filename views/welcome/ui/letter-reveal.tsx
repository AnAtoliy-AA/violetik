"use client";

import { m, useReducedMotion } from "motion/react";
import { cn } from "@/shared/lib/cn";

export interface LetterRevealProps {
  text: string;
  baseDelay?: number;
  stagger?: number;
  className?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ENTRANCE_DURATION = 1.1;

export function LetterReveal({
  text,
  baseDelay = 0.08,
  stagger = 0.07,
  className,
}: LetterRevealProps) {
  const reduceMotion = useReducedMotion();
  const letters = [...text];

  return (
    <span
      role="img"
      aria-label={text}
      className={cn("inline-flex overflow-hidden leading-[0.95]", className)}
    >
      {letters.map((char, i) => {
        const entranceDelay = baseDelay + i * stagger;
        const driftDelay = entranceDelay + ENTRANCE_DURATION + i * 0.12;

        return (
          <m.span
            key={`${char}-${i}`}
            aria-hidden
            className="inline-block"
            initial={reduceMotion ? false : { y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: reduceMotion ? 0 : ENTRANCE_DURATION,
              ease: EASE,
              delay: reduceMotion ? 0 : entranceDelay,
            }}
          >
            <m.span
              className="inline-block"
              animate={reduceMotion ? undefined : { y: [0, -4, 0, 4, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 5.4,
                      ease: "easeInOut",
                      repeat: Infinity,
                      delay: driftDelay,
                    }
              }
            >
              {char === " " ? " " : char}
            </m.span>
          </m.span>
        );
      })}
    </span>
  );
}
