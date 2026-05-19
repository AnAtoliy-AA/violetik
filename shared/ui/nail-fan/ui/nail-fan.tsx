import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import {
  NailTile,
  type NailTilePalette,
  type NailTileVariant,
} from "@/shared/ui/nail-tile";

export interface NailFanProps extends HTMLAttributes<HTMLDivElement> {
  palette?: NailTilePalette;
  count?: number;
  lift?: number;
}

export function NailFan({
  palette,
  count = 5,
  lift = 6,
  className,
  style,
  ...rest
}: NailFanProps) {
  const safeCount = Math.max(1, Math.floor(count));
  const safeLift = Math.max(0, lift);

  const wrapperStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    ...style,
  };

  return (
    <div
      role="presentation"
      className={cn(className)}
      style={wrapperStyle}
      {...rest}
    >
      {Array.from({ length: safeCount }).map((_, i) => (
        <NailTile
          key={i}
          palette={palette}
          variant={(i % 6) as NailTileVariant}
          style={{
            flex: 1,
            height: `calc(100% - ${(safeCount - 1 - i) * safeLift}px)`,
            borderRadius: "999px 999px 6px 6px",
            minHeight: 40,
          }}
        />
      ))}
    </div>
  );
}
