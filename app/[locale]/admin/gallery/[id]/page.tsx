import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { listGalleryCategories, getGalleryItemById, listGalleryItems } from "@/db/gallery";
import { pickLocalizedName } from "@/entities/gallery";
import { isPhotoStorageConfigured } from "@/shared/lib/photo-storage";
import type { Locale } from "@/i18n/routing";
import {
  GalleryItemEditor,
  createGalleryItemAction,
  updateGalleryItemAction,
} from "@/features/gallery-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "AdminGallery" });
  return {
    title: `Violetta — ${id === "new" ? t("title_new_item") : t("title_edit_item")}`,
  };
}

export default async function GalleryItemEditorRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }
  setRequestLocale(locale);
  const t = await getTranslations("AdminGallery");

  const isNew = id === "new";
  const [categoryRows, existing, allItems] = await Promise.all([
    listGalleryCategories(),
    isNew ? Promise.resolve(null) : getGalleryItemById(id),
    isNew ? listGalleryItems() : Promise.resolve([]),
  ]);
  if (!isNew && !existing) notFound();

  const categories = categoryRows.map((c) => ({
    id: c.id,
    name: pickLocalizedName(c, locale as Locale),
  }));

  const initial = existing
    ? {
        id: existing.id,
        categoryId: existing.categoryId,
        captionEn: existing.captionEn ?? "",
        captionRu: existing.captionRu ?? "",
        captionBy: existing.captionBy ?? "",
        alt: existing.alt ?? "",
        src: existing.src,
        width: existing.width,
        height: existing.height,
        sortOrder: existing.sortOrder,
      }
    : {
        id: "",
        categoryId: categories[0]?.id ?? "",
        captionEn: "",
        captionRu: "",
        captionBy: "",
        alt: "",
        src: null,
        width: null,
        height: null,
        sortOrder: allItems.length + 1,
      };

  return (
    <div className="pb-16">
      <AppHeader back="/admin/gallery" title={t("plate_title")} admin />
      <GalleryItemEditor
        mode={isNew ? "create" : "edit"}
        initial={initial}
        categories={categories}
        storageConfigured={isPhotoStorageConfigured()}
        onSubmit={isNew ? createGalleryItemAction : updateGalleryItemAction}
      />
    </div>
  );
}
