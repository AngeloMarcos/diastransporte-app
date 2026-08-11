// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        // src/lib/pwa.ts is the only registrar (guarded against dev/preview contexts).
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        outDir: "dist/client",
        // public/manifest.webmanifest is hand-maintained.
        manifest: false,
        workbox: {
          globDirectory: "dist/client",
          globPatterns: ["**/*.{css,js,woff,woff2,png,svg,ico,webmanifest,html}"],
          // Do not use offline.html as navigateFallback: that creates a
          // NavigationRoute which serves the offline page for every URL,
          // before the NetworkFirst route below gets a chance to run.
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first, fall back to the offline shell.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "shell-html",
                precacheFallback: { fallbackURL: "/offline.html" },
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Hashed same-origin build assets + icons only. No API/Supabase data is cached.
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["style", "script", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "shell-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
