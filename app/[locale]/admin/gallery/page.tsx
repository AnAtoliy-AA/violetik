import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { listGalleryCategories, listGalleryItems } from "@/db/gallery";
import {
  AdminGalleryList,
  reorderGalleryCategoriesAction,
  reorderGalleryItemsAction,
  deleteGalleryCategoryAction,
  deleteGalleryItemAction,
} from "@/features/gallery-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminGallery" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function AdminGalleryRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }
  setRequestLocale(locale);
  const t = await getTranslations("AdminGallery");

  const [categories, items] = await Promise.all([
    listGalleryCategories(),
    listGalleryItems(),
  ]);

  return (
    <div className="pb-16">
      <AppHeader back="/admin" title={t("plate_title")} admin />
      <section className="px-[22px] py-6">
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 mt-2 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="max-w-[420px] text-[14px] text-text-2">{t("paragraph")}</p>
      </section>
      <AdminGalleryList
        categories={categories}
        items={items}
        reorderCategoriesAction={reorderGalleryCategoriesAction}
        reorderItemsAction={reorderGalleryItemsAction}
        deleteCategoryAction={deleteGalleryCategoryAction}
        deleteItemAction={deleteGalleryItemAction}
      />
    </div>
  );
}
