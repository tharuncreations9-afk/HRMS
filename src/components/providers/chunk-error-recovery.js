"use client";

import { useEffect } from "react";

const RELOAD_KEY = "emp_chunk_reload";

function isChunkLoadError(message) {
  if (!message) return false;
  const text = String(message);
  return (
    text.includes("Loading chunk") ||
    text.includes("ChunkLoadError") ||
    text.includes("Failed to fetch dynamically imported module")
  );
}

/**
 * After a new deployment, stale HTML may reference missing JS chunks (404).
 * Reload once so the browser picks up the latest HTML + assets.
 */
export function ChunkErrorRecovery() {
  useEffect(() => {
    const tryReload = (message) => {
      if (!isChunkLoadError(message)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event) => {
      tryReload(event?.message || event?.error?.message);
    };

    const onRejection = (event) => {
      tryReload(event?.reason?.message || event?.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    sessionStorage.removeItem(RELOAD_KEY);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
