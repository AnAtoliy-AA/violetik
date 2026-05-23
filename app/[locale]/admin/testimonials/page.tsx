import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/shared/lib/auth-server";
import { listTestimonialsByStatus } from "@/db/testimonials";
import { AdminTestimonialsPage } from "@/views/admin-testimonials";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminTestimonials" });
  return { title: `Violetta — ${t("meta_title")}` };
}

export default async function AdminTestimonialsRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;

  // Mirrors app/[locale]/admin/services/page.tsx + admin/bookings/page.tsx:
  // when TELEGRAM_BOT_TOKEN is unset (local dev + CI without secrets),
  // the admin sub-routes stay open so route-level tests can render the
  // page. The gate activates the moment the env var is populated.
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect({ href: "/sign-in", locale });
  }

  setRequestLocale(locale);

  const [pending, approved, rejected] = await Promise.all([
    listTestimonialsByStatus("pending"),
    listTestimonialsByStatus("approved"),
    listTestimonialsByStatus("rejected"),
  ]);

  return (
    <AdminTestimonialsPage
      locale={locale as Locale}
      pending={pending}
      approved={approved}
      rejected={rejected}
    />
  );
}
