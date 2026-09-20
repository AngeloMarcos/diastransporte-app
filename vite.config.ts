// Build do app: TanStack Start (SSR) empacotado pelo nitro como servidor Node
// (imagem Docker do deploy próprio). Antes disto o projeto usava o wrapper
// @lovable.dev/vite-tanstack-config, que montava esta mesma pilha mas com alvo
// Cloudflare por padrão; agora a configuração é explícita.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    // Uma única cópia de React/React Query (duas cópias quebram hooks e contexto).
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Entrada SSR própria (src/server.ts): cabeçalhos de segurança, limite de
      // requisições e página de erro amigável.
      server: { entry: "server" },
      // Código de servidor nunca pode vazar para o bundle do navegador.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build"
      ? [nitro({ preset: process.env["NITRO_PRESET"] ?? "node_server" })]
      : []),
    viteReact(),
  ],
}));
