"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { usePushSubscription } from "../model/use-push-subscription";
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
} from "../api/actions";

export interface EnablePushButtonProps {
  vapidPublicKey: string;
}

export function EnablePushButton({ vapidPublicKey }: EnablePushButtonProps) {
  const t = useTranslations("Notifications");
  const [pending, startTransition] = useTransition();
  const { status, subscribe, unsubscribe } = usePushSubscription(vapidPublicKey);

  if (status === "unsupported") {
    return <p className="text-text-2 text-sm">{t("unsupported")}</p>;
  }
  if (status === "denied") {
    return <p className="text-text-2 text-sm">{t("denied")}</p>;
  }

  const onClick = () => {
    startTransition(async () => {
      if (status === "subscribed") {
        const ep = await unsubscribe();
        if (ep) await removePushSubscriptionAction(ep);
      } else {
        const sub = await subscribe();
        if (sub) {
          await savePushSubscriptionAction({
            ...sub,
            userAgent:
              typeof navigator !== "undefined" ? navigator.userAgent : null,
          });
        }
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending || status === "loading"}
      variant={status === "subscribed" ? "outline" : "solid"}
    >
      {status === "subscribed" ? t("disable_browser") : t("enable_browser")}
    </Button>
  );
}
