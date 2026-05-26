import "server-only";
import sharp from "sharp";

/**
 * §9.3 — extract a small dominant-color palette from a JPEG/PNG/WebP
 * buffer. Strategy: downsample to 64×64 RGB, walk every pixel,
 * quantise each channel to 5 bits (32 buckets), accumulate hit
 * counts per bucket, and return the top `count` buckets as hex
 * strings.
 *
 * Why not use sharp's built-in `.stats()` dominant?
 * - `.stats()` returns *one* dominant color. We want a stable 4-stop
 *   palette that reads as a brand-aware set, so a manual histogram
 *   gives us better control over the spread.
 *
 * Performance note: 64×64 × 3 bytes = 12 KB processed per call. On a
 * mid-Android-class server the whole pipeline (download + sharp +
 * histogram) lands inside ~80 ms for a 1280px JPEG.
 */
export interface ExtractPaletteOptions {
  /** Number of palette stops to return. Defaults to 4. */
  count?: number;
}

export async function extractPalette(
  buffer: Buffer,
  options: ExtractPaletteOptions = {},
): Promise<string[] | null> {
  const count = options.count ?? 4;
  try {
    const { data } = await sharp(buffer)
      .resize(64, 64, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Quantise to 5 bits per channel = 32^3 = 32 768 buckets. Sparse
    // map keeps memory tiny.
    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i + 2 < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }

    const sorted = Array.from(buckets.values())
      .sort((a, b) => b.n - a.n)
      .slice(0, count);

    return sorted.map(({ r, g, b, n }) => {
      const ar = Math.round(r / n);
      const ag = Math.round(g / n);
      const ab = Math.round(b / n);
      return (
        "#" +
        ar.toString(16).padStart(2, "0") +
        ag.toString(16).padStart(2, "0") +
        ab.toString(16).padStart(2, "0")
      );
    });
  } catch (error) {
    console.error("[extractPalette] failed", error);
    return null;
  }
}

/**
 * Fetch a remote image URL and run `extractPalette` on its bytes.
 * Convenience wrapper for callers that only have the Vercel Blob URL
 * (the admin upload pipeline does its own fetch via @vercel/blob and
 * passes the buffer in directly).
 */
export async function extractPaletteFromUrl(
  url: string,
  options?: ExtractPaletteOptions,
): Promise<string[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return extractPalette(buffer, options);
  } catch (error) {
    console.error("[extractPaletteFromUrl] fetch failed", error);
    return null;
  }
}
