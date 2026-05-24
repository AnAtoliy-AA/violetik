"use client";

import { useEffect } from "react";

/**
 * Registers the Serwist-built service worker once per client mount.
 * Silent component — no UI. Guards on browser support and avoids
 * blowing up in dev (Serwist disables SW emission in development, so
 * /sw.js wouldn't exist and the register call would 404).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[sw] register failed:", err));
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);
  return null;
}
