"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function GoldenSeal() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="relative mx-auto size-[130px]"
      initial={reduceMotion ? false : { scale: 0.5, rotate: -40, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE_OUT, delay: 0.2 }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #f3ead8 0%, #c9a96e 50%, #7d3a6f 100%)",
          boxShadow:
            "0 20px 40px -10px color-mix(in oklab, var(--color-accent) 40%, transparent)",
        }}
      />
      <div className="absolute inset-3 rounded-full border-[0.5px] border-white/45" />
      <motion.svg
        viewBox="0 0 60 60"
        className="absolute inset-0 m-auto size-10"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT, delay: 0.9 }}
      >
        <path
          d="M14 30 25 41 47 19"
          fill="none"
          stroke="#14091a"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
}
