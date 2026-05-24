"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "denied"
  | "idle"
  | "subscribed";

interface State {
  status: PushStatus;
  endpoint: string | null;
}

function computeInitialState(): State {
  if (typeof window === "undefined") return { status: "loading", endpoint: null };
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
    return { status: "unsupported", endpoint: null };
  }
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "denied"
  ) {
    return { status: "denied", endpoint: null };
  }
  return { status: "loading", endpoint: null };
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  // Allocate against a concrete ArrayBuffer (not SharedArrayBuffer) so
  // the result satisfies BufferSource for PushManager.subscribe — TS
  // narrows ArrayBufferLike too loosely without the explicit cast.
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out as Uint8Array<ArrayBuffer>;
}

export function usePushSubscription(vapidPublicKey: string) {
  const [state, setState] = useState<State>(computeInitialState);

  // Only the async branch (querying the SW registration for an existing
  // subscription) needs an effect. Synchronous availability is resolved
  // by the lazy initialiser above, so this effect never sets state on
  // mount — it only resolves into idle/subscribed once the SW promise
  // settles.
  useEffect(() => {
    if (state.status !== "loading") return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setState({
          status: sub ? "subscribed" : "idle",
          endpoint: sub?.endpoint ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "idle", endpoint: null });
      });
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  const subscribe = useCallback(async (): Promise<{
    endpoint: string;
    p256dh: string;
    auth: string;
  } | null> => {
    if (typeof window === "undefined" || !("PushManager" in window)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState({ status: "denied", endpoint: null });
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    const raw = sub.toJSON();
    setState({ status: "subscribed", endpoint: sub.endpoint });
    return {
      endpoint: sub.endpoint,
      p256dh: raw.keys?.p256dh ?? "",
      auth: raw.keys?.auth ?? "",
    };
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<string | null> => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      setState({ status: "idle", endpoint: null });
      return null;
    }
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    setState({ status: "idle", endpoint: null });
    return endpoint;
  }, []);

  return { ...state, subscribe, unsubscribe };
}
