/**
 * Single, guarded registrar for the offline app-shell service worker (/sw.js).
 * Never registers in dev, inside an iframe, in Lovable preview hosts, or with ?sw=off —
 * in those contexts it unregisters any matching worker instead.
 */
const SW_URL = "/sw.js";

function previewOrDevContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;

  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  const blocked = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  return blocked.some((base) => host === base || host.endsWith(`.${base}`));
}

async function unregisterAppWorker(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerOfflineShell(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (previewOrDevContext()) {
    void unregisterAppWorker();
    return;
  }

  void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
    /* offline shell is best-effort; never break the app */
  });
}
