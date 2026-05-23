import type { SiteSettings } from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";

export interface StudioMapDictionary {
  mapAria: string;
  mapTitle: string;
  getDirections: string;
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
      <iframe
        title={dictionary.mapTitle}
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-[16/9] w-full rounded border-[0.5px] border-line"
      />
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
