"use client";

import { useEffect } from "react";

const RELOAD_KEY = "emp_chunk_reload";
const MAX_RELOADS = 2;

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
  const tries = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);
  if (tries >= MAX_RELOADS) return;
  sessionStorage.setItem(RELOAD_KEY, String(tries + 1));

  if (window.caches?.keys) {
    window.caches.keys().then((names) => {
      names.forEach((name) => window.caches.delete(name));
    });
  }

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
    window.addEventListener("load", () => sessionStorage.removeItem(RELOAD_KEY));

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
