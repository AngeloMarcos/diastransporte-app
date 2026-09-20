// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// No build da VPS (VITE_AUTH_MODE=vps) nada fala com Supabase/Lovable Auth, mas os
// módulos gerados por eles eram empacotados mesmo assim e iam pro navegador de todo
// visitante (~100 KB de JS que só custa tempo de carregamento). Este plugin troca
// cada um pela versão *.vps.ts ao lado, resolvida depois dos aliases (@/ etc.).
// O build do Lovable Cloud (sem a variável) não é afetado.
const SUBSTITUTOS_VPS = [
  "src/integrations/supabase/client",
  "src/integrations/supabase/auth-attacher",
  "src/integrations/lovable/index",
];

function semSupabaseNaVps(): Plugin {
  return {
    name: "sem-supabase-na-vps",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || !/(supabase\/(client|auth-attacher)|lovable\/index)$/.test(source)) {
        return null;
      }
      const resolvido = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolvido) return null;
      // Caminho normalizado (barras normais, sem extensão) para comparar em qualquer SO.
      const limpo = resolvido.id
        .split("\\")
        .join("/")
        .replace(/\.tsx?$/, "");
      const alvo = SUBSTITUTOS_VPS.find((s) => limpo.endsWith(`/${s}`));
      return alvo ? `${limpo}.vps.ts` : null;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: process.env["VITE_AUTH_MODE"] === "vps" ? [semSupabaseNaVps()] : [],
  },
});
