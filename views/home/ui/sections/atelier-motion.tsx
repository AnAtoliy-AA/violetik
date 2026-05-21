import { useTranslations } from "next-intl";
import { STUDIO_DATA } from "@/entities/studio";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Plate } from "@/shared/ui/plate";

/**
 * Three vertical hairline-bordered cards, each playing a short looping clip.
 * Reads from STUDIO_DATA.atelierClips: when an entry has a `video.src`, the
 * <video> renders that source; when absent, a palette gradient stands in.
 * Captions are mono eyebrows.
 */
export function AtelierMotion() {
  const t = useTranslations("Home");
  const clips = STUDIO_DATA.atelierClips;
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
        {clips.map((clip) => {
          const caption = t(`atelier_motion_caption_${clip.key}`);
          const ariaLabel = clip.video?.alt ?? caption;
          return (
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
                preload={clip.video?.src ? "metadata" : "none"}
                poster={clip.video?.posterSrc ?? ""}
                aria-label={ariaLabel}
              >
                {clip.video?.src ? (
                  <source src={clip.video.src} />
                ) : null}
              </video>
              <figcaption className="absolute inset-x-2 bottom-2">
                <Eyebrow>{caption}</Eyebrow>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
