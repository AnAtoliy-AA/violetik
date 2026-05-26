import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface QrTileProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * QR matrix as rows of booleans (true = dark module). Square; pass a
   * matrix pre-computed at compile time from your encoder of choice so the
   * primitive stays dep-free.
   */
  matrix: ReadonlyArray<ReadonlyArray<boolean>>;
  /** Optional caption rendered below the tile in mono caps eyebrow. */
  caption?: ReactNode;
  /** Optional href turning the whole tile into a link (e.g. tg:// deep link). */
  href?: string;
  /** Tile edge length in pixels (default 192). */
  size?: number;
}

export function QrTile({
  matrix,
  caption,
  href,
  size = 192,
  className,
  ...rest
}: QrTileProps) {
  const rows = matrix.length;
  if (rows === 0 || matrix.some((row) => row.length !== rows)) {
    throw new Error("<QrTile> matrix must be a non-empty square");
  }

  const tile = (
    <div
      className={cn(
        "gilded rounded-md p-3 inline-flex flex-col items-center gap-2",
        "shadow-card",
        className,
      )}
      style={{ width: size + 24 }}
      {...rest}
    >
      <div
        className="grid leading-none font-display italic select-none text-accent-2"
        role="img"
        aria-label="QR code"
        style={{
          gridTemplateColumns: `repeat(${rows}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          width: size,
          height: size,
          fontSize: Math.max(6, Math.floor(size / rows)),
        }}
      >
        {matrix.flatMap((row, r) =>
          row.map((cell, c) => (
            <span
              key={`${r}-${c}`}
              aria-hidden
              className="flex items-center justify-center"
              style={{ opacity: cell ? 1 : 0 }}
            >
              •
            </span>
          )),
        )}
      </div>
      {caption ? (
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-text-2 mt-1">
          {caption}
        </span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="inline-flex no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {tile}
      </a>
    );
  }
  return tile;
}
