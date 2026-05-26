"use client";

import { useMemo, type CSSProperties } from "react";
import { m, useReducedMotion } from "motion/react";
import { cn } from "@/shared/lib/cn";

export interface FlameMonogramProps {
  /** Glyph rendered at the center. Defaults to the brand initial `V`. */
  letter?: string;
  className?: string;
  /** Rotation period in seconds. Default 24s. */
  rotationDuration?: number;
  /** Number of ember balls. Higher = denser flame, costlier render. */
  emberCount?: number;
}

// Number of stacked Z-layers used to extrude the letter. Higher = thicker
// 3D feel but more DOM nodes per render.
const LETTER_DEPTH = 22;

// Deterministic pseudo-random — integer-only mix via Math.imul so SSR and
// client agree bit-exactly. Math.sin (used previously) is a transcendental
// and its last-bit precision can differ between Node and the browser,
// causing a hydration mismatch.
function pseudo(seed: number, salt: number): number {
  let h = Math.imul(seed, 2654435761) ^ Math.imul(salt, 1597334677);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

interface Ember {
  size: number;
  x: number;
  delay: number;
  duration: number;
  core: boolean;
}

function buildEmbers(count: number): Ember[] {
  return Array.from({ length: count }, (_, i) => ({
    size: 12 + pseudo(i, 1) * 30,
    // Wider band (+/- 36px) so the flame wraps the V's width. Edge embers
    // are weighted toward the center via the falloff factor so the silhouette
    // still tapers as it rises.
    x: (-36 + pseudo(i, 2) * 72) * (0.55 + pseudo(i, 5) * 0.45),
    delay: -pseudo(i, 3) * 3,
    duration: 0.85 + pseudo(i, 4) * 0.55,
    core: i % 5 === 0,
  }));
}

interface Spark {
  size: number;
  x: number;
  driftX: number;
  delay: number;
  duration: number;
}

const SPARK_COUNT = 18;

// Free sparks fly off the flame body and drift upward independently of the
// metaball, giving the fire visible particles instead of just a continuous
// shape. They're rendered outside the goo mask so they remain individual.
function buildSparks(): Spark[] {
  return Array.from({ length: SPARK_COUNT }, (_, i) => ({
    size: 1.4 + pseudo(i + 1000, 1) * 2.6,
    x: -42 + pseudo(i + 1000, 2) * 84,
    driftX: -16 + pseudo(i + 1000, 5) * 32,
    delay: -pseudo(i + 1000, 3) * 2.5,
    duration: 1.6 + pseudo(i + 1000, 4) * 1.2,
  }));
}

export function FlameMonogram({
  letter = "V",
  className,
  rotationDuration = 24,
  emberCount = 130,
}: FlameMonogramProps) {
  const reduceMotion = useReducedMotion();
  const embers = useMemo(() => buildEmbers(emberCount), [emberCount]);
  const sparks = useMemo(() => buildSparks(), []);

  return (
    <div
      aria-hidden
      role="presentation"
      data-testid="flame-monogram"
      className={cn("relative size-full", className)}
    >
      {/* SVG-based metaball flame.
       *
       * Strategy:
       *   1. `feColorMatrix` row `0 0 0 18 -8` multiplies the blurred embers'
       *      alpha by 18 and subtracts 8 — soft blur gradients harden into a
       *      binary in/out, so overlapping blurred circles fuse into one
       *      solid liquid shape (the "goo" trick, alpha-only so no dark
       *      backdrop is needed).
       *   2. That goo'd shape is rendered into a `<mask>` and used to clip a
       *      static vertical gradient rectangle. The gradient supplies the
       *      flame's temperature gradient (hot white at the V's base, fading
       *      through gold and amber to deep orange at the tips). The flame
       *      therefore floats freely on the page with no visible backdrop
       *      shape, and the V appears to be the source of the fire because
       *      embers spawn at its baseline. */}
      <svg
        viewBox="0 0 200 250"
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-0 size-full overflow-visible"
      >
        <defs>
          <linearGradient id="fm-grad" x1="0" y1="100%" x2="0" y2="0%">
            <stop offset="0%" stopColor="#fff5d6" />
            <stop offset="22%" stopColor="#ffd28a" />
            <stop offset="50%" stopColor="#e8a04a" />
            <stop offset="80%" stopColor="#c9572a" />
            <stop offset="100%" stopColor="#c9572a" stopOpacity="0" />
          </linearGradient>

          <filter id="fm-goo" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur
              stdDeviation={reduceMotion ? "10" : "6"}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="gooed"
            />
            {reduceMotion ? null : (
              <>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.02 0.08"
                  numOctaves="2"
                  seed="3"
                  result="noise"
                >
                  <animate
                    attributeName="baseFrequency"
                    dur="6s"
                    values="0.02 0.06;0.035 0.09;0.025 0.08;0.04 0.075;0.02 0.06"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="gooed"
                  in2="noise"
                  scale="14"
                />
              </>
            )}
          </filter>

          <mask id="fm-mask">
            <g filter="url(#fm-goo)">
              {embers.map((ember, i) => (
                <circle
                  key={i}
                  cx={100 + ember.x}
                  cy={210}
                  r={ember.size / 2}
                  fill="#fff"
                  style={{
                    animation: reduceMotion
                      ? undefined
                      : `flameRise ${ember.duration}s linear ${ember.delay}s infinite`,
                  }}
                />
              ))}
            </g>
          </mask>
        </defs>

        {/* Main flame body — gradient clipped by the wavering metaball mask. */}
        <rect
          x="0"
          y="0"
          width="200"
          height="250"
          fill="url(#fm-grad)"
          mask="url(#fm-mask)"
        />

        {/* Hot white core at the base — a small bright spot that suggests the
         * V is the flame's fuel source. Not blurred by turbulence so it stays
         * a stable bright point of light. */}
        <ellipse
          cx="100"
          cy="200"
          rx="22"
          ry="12"
          fill="#fff5d6"
          opacity="0.55"
          style={{ filter: "blur(4px)" }}
        />

        {/* Free sparks — small particles that escape the metaball body and
         * drift upward independently. Rendered outside the mask so they read
         * as individual points of light rising from the fire. */}
        {sparks.map((spark, i) => (
          <circle
            key={i}
            cx={100 + spark.x}
            cy={200}
            r={spark.size}
            fill={i % 3 === 0 ? "#fff5d6" : "#ffd28a"}
            style={
              reduceMotion
                ? { opacity: 0.5 }
                : ({
                    // CSS var lets the shared keyframe drift each spark by a
                    // different horizontal amount.
                    "--sparkDriftX": `${spark.driftX}px`,
                    animation: `sparkRise ${spark.duration}s ease-out ${spark.delay}s infinite`,
                  } as CSSProperties)
            }
          />
        ))}
      </svg>

      {/* Amber atmospheric halo — soft radial glow centered on the V to give
       * the surrounding aurora a warm cast, suggesting heat. Rendered outside
       * the goo filter so it doesn't get absorbed into the metaball mask. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 75% at 50% 55%, rgba(255, 180, 90, 0.35), rgba(201, 87, 42, 0.18) 45%, transparent 80%)",
        }}
      />

      {/* Extruded 3D letter — `LETTER_DEPTH` copies stacked along the Z axis
       * give the glyph actual thickness so rotating around Y reveals the
       * letter's sides rather than collapsing it to an invisible plane.
       * The front face uses the gold-shimmer gradient; the recessed layers
       * fade to dark bronze, simulating shading down the extrusion. */}
      <m.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformPerspective: 900,
          transformStyle: "preserve-3d",
        }}
        animate={reduceMotion ? undefined : { rotateY: 360 }}
        transition={
          reduceMotion
            ? undefined
            : { duration: rotationDuration, repeat: Infinity, ease: "linear" }
        }
      >
        <div
          className="grid"
          style={{ transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: LETTER_DEPTH }).map((_, i) => {
            const z = i - (LETTER_DEPTH - 1);
            const isFront = i === LETTER_DEPTH - 1;
            // Lerp from dark bronze at the back to mid-gold near the front;
            // the actual front face is overridden with the shimmer gradient.
            const t = i / (LETTER_DEPTH - 1);
            const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
            const shade = `rgb(${lerp(58, 160)}, ${lerp(42, 130)}, ${lerp(18, 78)})`;
            return (
              <span
                key={i}
                className={cn(
                  "font-display text-[180px] font-light italic leading-none",
                  isFront && "text-gold-shimmer",
                )}
                style={{
                  gridArea: "1 / 1",
                  transform: `translateZ(${z}px)`,
                  color: isFront ? undefined : shade,
                  filter: isFront
                    ? "drop-shadow(0 2px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 18px rgba(232, 207, 153, 0.55))"
                    : undefined,
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </m.div>
    </div>
  );
}
