import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { getServiceById, listAllCategories } from "@/db/services";
import { getStudioPhoto } from "@/db/studio-photos";
import { isPhotoStorageConfigured } from "@/shared/lib/photo-storage";
import { pickLocalizedName } from "@/entities/service";
import type { Locale } from "@/i18n/routing";
import {
  ServiceEditor,
  createServiceAction,
  updateServiceAction,
  type ServiceEditorInitial,
} from "@/features/services-admin";
import { PhotoUploadRow } from "@/features/photo-upload-admin";
import type { ServiceFormInput } from "@/entities/service/model/schema";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "AdminServices" });
  return {
    title: `Violetta — ${id === "new" ? t("title_new_service") : t("title_edit_service")}`,
  };
}

export default async function ServiceEditorRoute({
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
  const t = await getTranslations("AdminServices");

  const categoryRows = await listAllCategories();
  const categories = categoryRows
    .filter((c) => c.status === "published")
    .map((c) => ({ id: c.id, name: pickLocalizedName(c, locale as Locale) }));

  const mode: "create" | "edit" = id === "new" ? "create" : "edit";

  let initial: ServiceEditorInitial;
  let photo: Awaited<ReturnType<typeof getStudioPhoto>> = null;

  if (mode === "create") {
    initial = {
      id: "",
      categoryId: categories[0]?.id ?? "",
      nameEn: "",
      nameRu: "",
      nameBy: "",
      blurbEn: "",
      blurbRu: "",
      blurbBy: "",
      includes: [],
      priceCents: 0,
      durationMinutes: 60,
      sortOrder: 0,
      status: "draft",
    };
  } else {
    const [row, p] = await Promise.all([
      getServiceById(id),
      getStudioPhoto("service", id),
    ]);
    if (!row) notFound();
    photo = p;
    initial = {
      id: row.id,
      categoryId: row.categoryId,
      nameEn: row.nameEn,
      nameRu: row.nameRu,
      nameBy: row.nameBy,
      blurbEn: row.blurbEn,
      blurbRu: row.blurbRu,
      blurbBy: row.blurbBy,
      includes: row.includes ?? [],
      priceCents: row.priceCents,
      durationMinutes: row.durationMinutes,
      sortOrder: row.sortOrder,
      status: row.status,
    };
  }

  async function onSubmit(patch: ServiceFormInput) {
    "use server";
    if (mode === "create") return createServiceAction(patch);
    // id is frozen on edit — strip it from the patch so update-service's
    // server-side schema (which omits id) accepts the payload cleanly.
    const rest: Omit<ServiceFormInput, "id"> = {
      categoryId: patch.categoryId,
      nameEn: patch.nameEn,
      nameRu: patch.nameRu,
      nameBy: patch.nameBy,
      blurbEn: patch.blurbEn,
      blurbRu: patch.blurbRu,
      blurbBy: patch.blurbBy,
      includes: patch.includes,
      priceCents: patch.priceCents,
      durationMinutes: patch.durationMinutes,
      sortOrder: patch.sortOrder,
      status: patch.status,
    };
    return updateServiceAction(id, rest);
  }

  const photoSlot =
    mode === "edit" ? (
      <PhotoUploadRow
        slot={{
          kind: "service",
          id,
          label: t("label_photo"),
          hint: t("label_photo_hint"),
        }}
        current={photo?.image ?? null}
        storageConfigured={isPhotoStorageConfigured()}
      />
    ) : undefined;

  return (
    <div className="pb-16">
      <AppHeader back="/admin/services" title={t("plate_title")} admin />
      <ServiceEditor
        mode={mode}
        initial={initial}
        categories={categories}
        onSubmit={onSubmit}
        photoSlot={photoSlot}
      />
    </div>
  );
}
