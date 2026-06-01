"use client";

import { useEffect } from "react";

/**
 * Register the read-only offline cache. Production only — caching dev HMR
 * would break Fast Refresh.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("Service worker registration failed", err);
      });
  }, []);
  return null;
}
