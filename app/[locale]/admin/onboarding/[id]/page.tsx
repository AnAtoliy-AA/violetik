import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { AppHeader } from "@/widgets/app-header";
import { listOnboardingSlides, getOnboardingSlideById } from "@/db/onboarding";
import { isPhotoStorageConfigured } from "@/shared/lib/photo-storage";
import {
  OnboardingSlideEditor,
  createOnboardingSlideAction,
  updateOnboardingSlideAction,
} from "@/features/onboarding-admin";

export const dynamic = "force-dynamic";

type Params = { locale: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "AdminOnboarding" });
  return {
    title: `Violetta — ${id === "new" ? t("title_new_slide") : t("title_edit_slide")}`,
  };
}

export default async function OnboardingSlideEditorRoute({
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
  const t = await getTranslations("AdminOnboarding");

  const isNew = id === "new";
  const [existing, allSlides] = await Promise.all([
    isNew ? Promise.resolve(null) : getOnboardingSlideById(id),
    isNew ? listOnboardingSlides() : Promise.resolve([]),
  ]);
  if (!isNew && !existing) notFound();

  const initial = existing
    ? {
        id: existing.id,
        eyebrowEn: existing.eyebrowEn,
        eyebrowRu: existing.eyebrowRu,
        eyebrowBy: existing.eyebrowBy,
        titleEn: existing.titleEn,
        titleRu: existing.titleRu,
        titleBy: existing.titleBy,
        bodyEn: existing.bodyEn,
        bodyRu: existing.bodyRu,
        bodyBy: existing.bodyBy,
        src: existing.src,
        width: existing.width,
        height: existing.height,
        variant: existing.variant,
        sortOrder: existing.sortOrder,
      }
    : {
        id: "",
        eyebrowEn: "",
        eyebrowRu: "",
        eyebrowBy: "",
        titleEn: "",
        titleRu: "",
        titleBy: "",
        bodyEn: "",
        bodyRu: "",
        bodyBy: "",
        src: null,
        width: null,
        height: null,
        variant: 1,
        sortOrder: allSlides.length + 1,
      };

  return (
    <div className="pb-16">
      <AppHeader back="/admin/onboarding" title={t("plate_title")} admin />
      <OnboardingSlideEditor
        mode={isNew ? "create" : "edit"}
        initial={initial}
        storageConfigured={isPhotoStorageConfigured()}
        onSubmit={isNew ? createOnboardingSlideAction : updateOnboardingSlideAction}
      />
    </div>
  );
}
