import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/widgets/app-header";
import { listAllPhotoSlots, PhotoUploadRow } from "@/features/photo-upload-admin";
import { getStudioPhotos } from "@/db/studio-photos";
import { isPhotoStorageConfigured } from "@/shared/lib/photo-storage";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { Eyebrow } from "@/shared/ui/eyebrow";
import type { ImageAsset } from "@/entities/studio";
import type { PhotoSlotKind } from "@/db/schema";

const KINDS: readonly PhotoSlotKind[] = [
  "service",
  "gallery",
  "atelier",
  "master",
  "testimonial",
  "profile",
];

export async function AdminPhotosPage() {
  const t = await getTranslations("Admin.photos");
  const slots = listAllPhotoSlots();
  const storageConfigured = isPhotoStorageConfigured();

  // Pull every kind once, then index by slotId for cheap lookup in the
  // render loop. Six kinds, small fan-out — fine for now.
  const photosByKind = new Map<
    PhotoSlotKind,
    Map<string, ImageAsset>
  >();
  await Promise.all(
    KINDS.map(async (kind) => {
      const rows = await getStudioPhotos(kind);
      const byId = new Map<string, ImageAsset>();
      for (const r of rows) byId.set(r.slotId, r.image);
      photosByKind.set(kind, byId);
    }),
  );

  const groups = KINDS.map((kind) => ({
    kind,
    label: t(`group_${kind}`),
    slots: slots.filter((s) => s.kind === kind),
  })).filter((g) => g.slots.length > 0);

  return (
    <div className="pb-10">
      <AppHeader back="/admin" title={t("plate_title")} admin />

      <section className="px-[22px] pb-4 pt-3">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="my-2.5 mt-3 font-display text-h1 font-light italic leading-tight tracking-[-0.02em]">
          {t("title")}
        </h1>
        <LetterpressRule className="mt-3 max-w-[240px]" />
        <p className="m-0 mt-3 max-w-[420px] text-[13px] text-text-2">
          {t("paragraph")}
        </p>
        {!storageConfigured ? (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-rose">
            {t("storage_not_configured_banner")}
          </p>
        ) : null}
      </section>

      {groups.map((group) => (
        <section key={group.kind} className="px-[22px] py-4">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-text-2">
            {group.label}
          </h2>
          <div className="flex flex-col gap-3">
            {group.slots.map((slot) => (
              <PhotoUploadRow
                key={`${slot.kind}-${slot.id}`}
                slot={slot}
                current={photosByKind.get(slot.kind)?.get(slot.id) ?? null}
                storageConfigured={storageConfigured}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
