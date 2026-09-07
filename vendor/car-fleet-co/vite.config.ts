import { defineConfig, loadEnv, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(async ({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  const plugins: PluginOption[] = [tailwindcss(), tsConfigPaths({ projects: ["./tsconfig.json"] })];

  if (mode === "development") {
    const { devtools } = await import("@tanstack/devtools-vite");
    plugins.push(
      devtools({
        logging: false,
        eventBusConfig: { enabled: false },
        enhancedLogs: { enabled: false },
        consolePiping: { enabled: false },
        removeDevtoolsOnBuild: false,
        injectSource: { enabled: true },
      }),
    );
  }

  plugins.push(
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // TanStack Start's bundled server entry is redirected to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
  );

  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    // Deploy próprio (VPS) roda em Node puro, não Cloudflare Workers — o
    // Dockerfile define NITRO_PRESET=node_server nesse caso (mesmo padrão do
    // projeto irmão Dias Transporte). Sem essa variável, mantém o preset do
    // Lovable Cloud de sempre.
    plugins.push(nitro({ defaultPreset: process.env["NITRO_PRESET"] ?? "cloudflare-module" }));
  }

  plugins.push(viteReact());

  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define,
    // Client-scoped so React DevTools gets the dev react-dom; a global NODE_ENV
    // flip would emit jsxDEV, which the react-server SSR runtime can't resolve.
    ...(isDevBuild
      ? {
          environments: { client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } } },
          esbuild: { keepNames: true },
        }
      : {}),
    // Match the build's CSS pipeline in dev. Vite uses PostCSS in dev and only
    // runs Lightning CSS at build, so build-time transforms (e.g. collapsing a
    // hand-written `-webkit-backdrop-filter` to the prefixed form Chrome ignores)
    // break the built/static output while the dev preview looks fine. Running
    // Lightning CSS in both keeps the preview honest.
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    // Dep re-optimization rotates the optimized-dep hash and 504s tabs holding
    // the old one; pre-bundle the always-present client deps + tolerate stale
    // requests. React core only — including @tanstack/react-start would pull its
    // node:async_hooks server entry into the client bundle and crash hydration.
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
    },
    plugins,
  };
});