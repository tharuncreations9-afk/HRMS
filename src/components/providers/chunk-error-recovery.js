"use client";

import { useEffect } from "react";

const RELOAD_KEY = "emp_chunk_reload";
const BUILD_CHECK_KEY = "emp_build_check";

function isChunkLoadError(message) {
  if (!message) return false;
  const text = String(message);
  return (
    text.includes("Loading chunk") ||
    text.includes("ChunkLoadError") ||
    text.includes("Failed to fetch dynamically imported module") ||
    text.includes("Importing a module script failed")
  );
}

function isNextStaticAsset(url) {
  if (!url) return false;
  return /\/_next\/static\//.test(String(url));
}

function reloadOnce() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");

  const url = new URL(window.location.href);
  url.searchParams.set("_cb", String(Date.now()));
  window.location.replace(url.toString());
}

/**
 * Recovers from stale deployments where HTML references missing JS/CSS chunks (400/404).
 * Also handles ChunkLoadError and React chunk import failures app-wide.
 */
export function ChunkErrorRecovery() {
  useEffect(() => {
    const tryReloadFromMessage = (message) => {
      if (isChunkLoadError(message)) reloadOnce();
    };

    const onError = (event) => {
      tryReloadFromMessage(event?.message || event?.error?.message);

      const target = event?.target;
      if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
        const assetUrl = target.src || target.href;
        if (isNextStaticAsset(assetUrl)) reloadOnce();
      }
    };

    const onRejection = (event) => {
      const reason = event?.reason;
      tryReloadFromMessage(reason?.message || String(reason || ""));
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);

    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.removeItem(BUILD_CHECK_KEY);
    }

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
