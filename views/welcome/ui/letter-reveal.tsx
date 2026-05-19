"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/shared/lib/cn";

export interface LetterRevealProps {
  text: string;
  baseDelay?: number;
  stagger?: number;
  className?: string;
}

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
      aria-label={text}
      className={cn("inline-flex overflow-hidden leading-[0.95]", className)}
    >
      {letters.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          aria-hidden
          className="inline-block"
          initial={reduceMotion ? false : { y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 1.1,
            ease: [0.22, 1, 0.36, 1],
            delay: reduceMotion ? 0 : baseDelay + i * stagger,
          }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}
