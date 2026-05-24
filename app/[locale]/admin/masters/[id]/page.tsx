import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { listAllServices, listAllCategories } from "@/db/services";
import { getStudioPhoto } from "@/db/studio-photos";
import { loadMasterBySlugForLocale } from "@/entities/master/api/load";
import { isPhotoStorageConfigured } from "@/shared/lib/photo-storage";
import {
  MasterEditor,
  createMasterAction,
  updateMasterAction,
  type MasterEditorInitial,
  type ServiceOption,
} from "@/features/masters-admin";
import { PhotoUploadRow } from "@/features/photo-upload-admin";
import type { MasterFormInput } from "@/entities/master/model/schema";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "AdminMasters" });
  return {
    title: `Violetta — ${id === "new" ? t("title_new_master") : t("title_edit_master")}`,
  };
}

export default async function MasterEditorRoute({
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
  const t = await getTranslations("AdminMasters");

  // Build the specialty picker's service list. Use listAllServices (not
  // listPublishedServices) so admins can pre-assign a draft service to
  // a master before publishing it. Filter to non-archived.
  const [allServices, allCategories] = await Promise.all([
    listAllServices(),
    listAllCategories(),
  ]);
  const categoryNameById = new Map(allCategories.map((c) => [c.id, c.nameEn]));
  const services: ServiceOption[] = allServices
    .filter((s) => s.status !== "archived")
    .map((s) => ({
      id: s.id,
      name: s.nameEn,
      categoryId: s.categoryId,
      categoryName: categoryNameById.get(s.categoryId) ?? s.categoryId,
    }));

  const mode: "create" | "edit" = id === "new" ? "create" : "edit";

  let initial: MasterEditorInitial;
  let photo: Awaited<ReturnType<typeof getStudioPhoto>> = null;

  if (mode === "create") {
    initial = {
      id: "",
      nameEn: "",
      nameRu: "",
      nameBy: "",
      roleEn: "",
      roleRu: "",
      roleBy: "",
      bioEn: "",
      bioRu: "",
      bioBy: "",
      quoteEn: "",
      quoteRu: "",
      quoteBy: "",
      years: 0,
      setsLabel: "",
      sortOrder: 0,
      status: "draft",
      serviceIds: [],
      telegramUsername: null,
    };
  } else {
    const [master, p] = await Promise.all([
      loadMasterBySlugForLocale(id, locale as Locale),
      getStudioPhoto("master", id),
    ]);
    if (!master) notFound();
    photo = p;
    // For the editor we need the raw en/ru/be triples, not the
    // locale-resolved Master. Pull them by re-fetching the row.
    // (loadMasterBySlugForLocale returns the locale-resolved shape.)
    // Cheaper alternative: hit getMasterById directly.
    const { getMasterById } = await import("@/db/masters");
    const row = await getMasterById(id);
    if (!row) notFound();
    initial = {
      id: row.id,
      nameEn: row.nameEn,
      nameRu: row.nameRu,
      nameBy: row.nameBy,
      roleEn: row.roleEn,
      roleRu: row.roleRu,
      roleBy: row.roleBy,
      bioEn: row.bioEn,
      bioRu: row.bioRu,
      bioBy: row.bioBy,
      quoteEn: row.quoteEn,
      quoteRu: row.quoteRu,
      quoteBy: row.quoteBy,
      years: row.years,
      setsLabel: row.setsLabel,
      sortOrder: row.sortOrder,
      status: row.status,
      serviceIds: master.serviceIds,
      telegramUsername: row.telegramUsername,
    };
  }

  async function onSubmit(
    patch: MasterFormInput,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    "use server";
    if (mode === "create") {
      const r = await createMasterAction(patch);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    // id is frozen on edit — strip it from the patch.
    const rest: Omit<MasterFormInput, "id"> = {
      nameEn: patch.nameEn,
      nameRu: patch.nameRu,
      nameBy: patch.nameBy,
      roleEn: patch.roleEn,
      roleRu: patch.roleRu,
      roleBy: patch.roleBy,
      bioEn: patch.bioEn,
      bioRu: patch.bioRu,
      bioBy: patch.bioBy,
      quoteEn: patch.quoteEn,
      quoteRu: patch.quoteRu,
      quoteBy: patch.quoteBy,
      years: patch.years,
      setsLabel: patch.setsLabel,
      sortOrder: patch.sortOrder,
      status: patch.status,
      serviceIds: patch.serviceIds,
      telegramUsername: patch.telegramUsername,
    };
    const r = await updateMasterAction(id, rest);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  const photoSlot =
    mode === "edit" ? (
      <PhotoUploadRow
        slot={{
          kind: "master",
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
      <AppHeader back="/admin/masters" title={t("plate_title")} admin />
      <MasterEditor
        mode={mode}
        initial={initial}
        services={services}
        onSubmit={onSubmit}
        photoSlot={photoSlot}
      />
    </div>
  );
}
