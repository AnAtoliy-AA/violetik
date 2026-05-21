import { useTranslations } from "next-intl";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";

interface Clip {
  key: "buff" | "polish" | "design";
  /** Decorative palette for the placeholder background until real video lands. */
  palette: readonly [string, string];
}

const CLIPS: readonly Clip[] = [
  { key: "buff", palette: ["#7d3a6f", "#c9a96e"] },
  { key: "polish", palette: ["#9d7bc7", "#e8cf99"] },
  { key: "design", palette: ["#d9a3b6", "#7d3a6f"] },
] as const;

/**
 * Three vertical hairline-bordered cards, each playing (eventually) a short
 * looping clip. Until real footage ships the <video> stays unsourced and a
 * radial gradient placeholder shows under it. Captions are mono eyebrows.
 */
export function AtelierMotion() {
  const t = useTranslations("Home");
  return (
    <section className="px-[22px] pb-7 pt-6">
      <div className="flex items-end justify-between">
        <Plate folio number={6} label={t("plate_atelier").toUpperCase()} />
      </div>
      <h2 className="mt-2 font-display text-h2 font-normal italic leading-[1.05] tracking-[-0.02em]">
        {t("atelier_motion_title_a")}{" "}
        <em>{t("atelier_motion_title_b")}</em>.
      </h2>
      <LetterpressRule className="mb-4 mt-3" />
      <div className="grid grid-cols-3 gap-2.5">
        {CLIPS.map((clip) => (
          <figure
            key={clip.key}
            className="gilded relative aspect-[3/4] overflow-hidden rounded-[14px]"
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 70% 60% at 50% 35%, ${clip.palette[0]} 0%, ${clip.palette[1]} 55%, var(--color-bg) 100%)`,
              }}
            />
            <video
              className="absolute inset-0 size-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster=""
              aria-label={t(`atelier_motion_caption_${clip.key}`)}
            >
              {/* Real footage is wired in a follow-up; the gradient stands in. */}
            </video>
            <figcaption className="absolute inset-x-2 bottom-2">
              <Eyebrow>{t(`atelier_motion_caption_${clip.key}`)}</Eyebrow>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
