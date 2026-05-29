import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import {
  listGalleryCategories,
  getGalleryCategoryById,
} from "@/db/gallery";
import {
  GalleryCategoryEditor,
  createGalleryCategoryAction,
  updateGalleryCategoryAction,
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
    title: `Violetta — ${id === "new" ? t("title_new_category") : t("title_edit_category")}`,
  };
}

export default async function GalleryCategoryEditorRoute({
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
  const existing = isNew ? null : await getGalleryCategoryById(id);
  if (!isNew && !existing) notFound();

  const initial = existing
    ? {
        id: existing.id,
        nameEn: existing.nameEn,
        nameRu: existing.nameRu,
        nameBy: existing.nameBy,
        sortOrder: existing.sortOrder,
      }
    : {
        id: "",
        nameEn: "",
        nameRu: "",
        nameBy: "",
        sortOrder: (await listGalleryCategories()).length + 1,
      };

  return (
    <div className="pb-16">
      <AppHeader back="/admin/gallery" title={t("plate_title")} admin />
      <GalleryCategoryEditor
        mode={isNew ? "create" : "edit"}
        initial={initial}
        onSubmit={isNew ? createGalleryCategoryAction : updateGalleryCategoryAction}
      />
    </div>
  );
}
