const RELOAD_KEY = "emp_chunk_reload";
const MAX_RELOADS = 2;

/** Remove legacy ?_cb= cache-bust query param from the address bar. */
export function stripCacheBustParam() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("_cb")) return;
    url.searchParams.delete("_cb");
    const qs = url.searchParams.toString();
    const clean = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
    window.history.replaceState(null, "", clean);
  } catch {
    // ignore
  }
}

export function isChunkLoadError(message) {
  if (!message) return false;
  const text = String(message);
  return (
    text.includes("Loading chunk") ||
    text.includes("ChunkLoadError") ||
    text.includes("Failed to fetch dynamically imported module") ||
    text.includes("Importing a module script failed")
  );
}

export function isNextStaticAsset(url) {
  if (!url) return false;
  return /\/_next\/static\//.test(String(url));
}

/** Hard reload after stale chunk errors — no query-string cache bust. */
export function reloadForStaleChunks() {
  if (typeof window === "undefined") return;
  const tries = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);
  if (tries >= MAX_RELOADS) return;
  sessionStorage.setItem(RELOAD_KEY, String(tries + 1));

  if (window.caches?.keys) {
    window.caches.keys().then((names) => {
      names.forEach((name) => window.caches.delete(name));
    });
  }

  window.location.reload();
}

export function clearChunkReloadState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RELOAD_KEY);
  stripCacheBustParam();
}
