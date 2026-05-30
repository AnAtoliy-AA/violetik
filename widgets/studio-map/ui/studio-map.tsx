import type { SiteSettings } from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";

export interface StudioMapDictionary {
  mapAria: string;
  mapTitle: string;
  getDirections: string;
  /** §11.5 — optional mono caps stamp overlay e.g. "STUDIO · MINSK · ZAVADSKAGA 6A · 3RD FLR" */
  stampOverlay?: string;
}

export interface StudioMapProps {
  settings: SiteSettings;
  dictionary: StudioMapDictionary;
}

const BBOX_DELTA = 0.005; // ~500m at typical latitudes

export function StudioMap({ settings, dictionary }: StudioMapProps) {
  if (!settings.mapVisible) return null;
  if (settings.latitude == null || settings.longitude == null) return null;

  const lat = settings.latitude;
  const lng = settings.longitude;
  const minLat = lat - BBOX_DELTA;
  const maxLat = lat + BBOX_DELTA;
  const minLng = lng - BBOX_DELTA;
  const maxLng = lng + BBOX_DELTA;

  const embedSrc =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${minLng},${minLat},${maxLng},${maxLat}` +
    `&layer=mapnik` +
    `&marker=${lat},${lng}`;
  const directionsHref =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <section
      aria-label={dictionary.mapAria}
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col items-center gap-2"
    >
      <div className="gilded relative w-full overflow-hidden rounded-md">
        <iframe
          title={dictionary.mapTitle}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-[16/9] w-full block"
        />
        {dictionary.stampOverlay ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-2 top-2 rounded-sm bg-bg/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.28em] text-text backdrop-blur-sm"
          >
            {dictionary.stampOverlay}
          </div>
        ) : null}
      </div>
      <a
        href={directionsHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
      >
        {dictionary.getDirections}
      </a>
    </section>
  );
}
