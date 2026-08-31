// Config de teste separada da de build (vite.config.ts) de propósito: essa
// carrega o wrapper @lovable.dev/vite-tanstack-config (TanStack Start, nitro,
// Cloudflare/node target) que não faz sentido — e pode nem funcionar — dentro
// do runtime do Vitest. Testes aqui cobrem só lógica pura (validação, preço,
// mensagens do WhatsApp, carrinho), não SSR nem rotas.
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
