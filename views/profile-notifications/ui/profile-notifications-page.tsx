import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getNotificationPreferences } from "@/db/notification-preferences";
import { NotificationSettings } from "@/features/notification-preferences";
import type { NotificationCategory } from "@/shared/lib/notifications/types";

export async function ProfileNotificationsPage({
  locale,
}: {
  locale: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/profile/notifications`);
  }
  const [t, prefs] = await Promise.all([
    getTranslations("Notifications"),
    getNotificationPreferences(user.id),
  ]);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      {!vapid && (
        <p className="rounded-md border border-line bg-surface/60 px-4 py-3 text-sm text-text-2">
          {t("vapid_missing")}
        </p>
      )}
      <NotificationSettings
        isAdmin={user.role === "admin"}
        initialPreferences={prefs as Partial<Record<NotificationCategory, boolean>>}
        vapidPublicKey={vapid}
      />
    </main>
  );
}
