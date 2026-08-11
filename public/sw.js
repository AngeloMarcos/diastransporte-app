// One-release cleanup worker for the retired offline app shell.
// Keep this file at /sw.js so browsers controlled by an older worker receive it.
function isRetiredAppCache(name) {
  const isNamedShellCache = name === "shell-html" || name === "shell-assets";
  const isWorkboxCacheForThisOrigin =
    /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) &&
    name.endsWith(self.registration.scope);

  return isNamedShellCache || isWorkboxCacheForThisOrigin;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const retiredCacheNames = cacheNames.filter(isRetiredAppCache);
        await Promise.allSettled(retiredCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();

        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);