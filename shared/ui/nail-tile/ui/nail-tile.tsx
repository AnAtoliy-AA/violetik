import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type NailTileVariant = 0 | 1 | 2 | 3 | 4 | 5;
export type NailTilePalette = readonly [string, string];

export interface NailTileProps extends HTMLAttributes<HTMLDivElement> {
  palette?: NailTilePalette;
  variant?: NailTileVariant;
}

const DEFAULT_PALETTE: NailTilePalette = ["#c9a96e", "#7d3a6f"];

const FILM_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

function compose(a: string, b: string): string[] {
  return [
    // 0 — domed jewel with soft glow
    [
      `radial-gradient(ellipse 22% 14% at 32% 28%, rgba(255,255,255,0.55), transparent 60%)`,
      `radial-gradient(ellipse 45% 32% at 55% 60%, ${a} 0%, transparent 80%)`,
      `radial-gradient(ellipse 80% 90% at 50% 60%, ${b} 0%, color-mix(in oklab, ${b} 50%, #000) 70%, #000 100%)`,
    ].join(", "),
    // 1 — satin drape
    [
      `radial-gradient(ellipse 30% 20% at 70% 20%, rgba(255,255,255,0.28), transparent 65%)`,
      `linear-gradient(125deg, color-mix(in oklab, ${a} 90%, #fff) 0%, ${a} 30%, ${b} 70%, color-mix(in oklab, ${b} 60%, #000) 100%)`,
    ].join(", "),
    // 2 — atelier still life
    [
      `radial-gradient(ellipse 40% 20% at 50% 92%, rgba(0,0,0,0.5), transparent 70%)`,
      `radial-gradient(ellipse 22% 12% at 40% 30%, rgba(255,255,255,0.5), transparent 55%)`,
      `radial-gradient(ellipse 55% 80% at 50% 45%, ${a} 0%, ${b} 65%, color-mix(in oklab, ${b} 40%, #000) 100%)`,
    ].join(", "),
    // 3 — marble swirl
    [
      `radial-gradient(ellipse 25% 15% at 25% 25%, rgba(255,255,255,0.32), transparent 60%)`,
      `radial-gradient(ellipse 60% 40% at 70% 75%, color-mix(in oklab, ${a} 70%, #fff) 0%, transparent 60%)`,
      `linear-gradient(170deg, ${b} 0%, color-mix(in oklab, ${a} 50%, ${b}) 50%, ${b} 100%)`,
    ].join(", "),
    // 4 — chrome bevel
    [
      `radial-gradient(ellipse 30% 8% at 50% 10%, rgba(255,255,255,0.7), transparent 70%)`,
      `linear-gradient(180deg, color-mix(in oklab, ${a} 85%, #fff) 0%, ${a} 25%, color-mix(in oklab, ${a} 70%, ${b}) 50%, ${a} 75%, color-mix(in oklab, ${a} 80%, #fff) 100%)`,
    ].join(", "),
    // 5 — ink wash
    [
      `radial-gradient(ellipse 18% 10% at 35% 22%, rgba(255,255,255,0.4), transparent 60%)`,
      `radial-gradient(ellipse 100% 70% at 50% 100%, ${b} 0%, color-mix(in oklab, ${b} 30%, #000) 60%, #000 100%)`,
      `radial-gradient(ellipse 60% 40% at 55% 35%, color-mix(in oklab, ${a} 80%, ${b}) 0%, transparent 70%)`,
    ].join(", "),
  ];
}

export function NailTile({
  palette = DEFAULT_PALETTE,
  variant = 0,
  className,
  style,
  ...rest
}: NailTileProps) {
  const [a, b] = palette;
  const compositions = compose(a, b);
  const layer = compositions[variant % compositions.length];

  const composedStyle: CSSProperties = {
    background: layer,
    boxShadow: "inset 0 0 60px rgba(0,0,0,0.35)",
    ...style,
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={composedStyle}
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: FILM_GRAIN_URL }}
      />
    </div>
  );
}
