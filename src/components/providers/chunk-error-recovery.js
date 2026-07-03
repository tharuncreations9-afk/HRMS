"use client";

import { useEffect } from "react";
import {
  clearChunkReloadState,
  isChunkLoadError,
  isNextStaticAsset,
  reloadForStaleChunks,
  stripCacheBustParam,
} from "@/lib/chunk-reload";

/**
 * Recovers from stale deployments where HTML references missing JS/CSS chunks (400/404).
 * Also handles ChunkLoadError and dynamic import failures app-wide.
 */
export function ChunkErrorRecovery() {
  useEffect(() => {
    stripCacheBustParam();

    const tryReloadFromMessage = (message) => {
      if (isChunkLoadError(message)) reloadForStaleChunks();
    };

    const onError = (event) => {
      tryReloadFromMessage(event?.message || event?.error?.message);

      const target = event?.target;
      if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
        const assetUrl = target.src || target.href;
        if (isNextStaticAsset(assetUrl)) reloadForStaleChunks();
      }
    };

    const onRejection = (event) => {
      const reason = event?.reason;
      tryReloadFromMessage(reason?.message || String(reason || ""));
    };

    const onLoad = () => clearChunkReloadState();

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
