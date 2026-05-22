import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { listAllCategories, listAllServices } from "@/db/services";
import {
  CategoryEditor,
  createCategoryAction,
  updateCategoryAction,
  type CategoryEditorInitial,
} from "@/features/services-admin";
import type { CategoryFormInput } from "@/entities/service/model/schema";

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
    title: `Violetta — ${id === "new" ? t("title_new_category") : t("title_edit_category")}`,
  };
}

export default async function CategoryEditorRoute({
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

  const mode: "create" | "edit" = id === "new" ? "create" : "edit";

  let initial: CategoryEditorInitial;
  let blockingServiceCount = 0;

  if (mode === "create") {
    initial = {
      id: "",
      nameEn: "",
      nameRu: "",
      nameBe: "",
      sortOrder: 0,
      status: "published",
    };
  } else {
    const [categories, services] = await Promise.all([
      listAllCategories(),
      listAllServices(),
    ]);
    const row = categories.find((c) => c.id === id);
    if (!row) notFound();
    initial = {
      id: row.id,
      nameEn: row.nameEn,
      nameRu: row.nameRu,
      nameBe: row.nameBe,
      sortOrder: row.sortOrder,
      status: row.status,
    };
    blockingServiceCount = services.filter(
      (s) => s.categoryId === id && s.status !== "archived",
    ).length;
  }

  async function onSubmit(patch: CategoryFormInput) {
    "use server";
    if (mode === "create") return createCategoryAction(patch);
    const { id: _id, ...rest } = patch;
    return updateCategoryAction(id, rest);
  }

  return (
    <div className="pb-16">
      <AppHeader back="/admin/services" title={t("plate_title")} admin />
      <CategoryEditor
        mode={mode}
        initial={initial}
        onSubmit={onSubmit}
        archiveBlockingCount={
          mode === "edit" ? blockingServiceCount : undefined
        }
      />
    </div>
  );
}
