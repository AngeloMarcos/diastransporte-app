// Config de teste separada da vite.config.ts de propósito — esta última
// carrega o plugin do nitro/TanStack Start, que não tem nada a ver com o
// test runner e pode nem funcionar rodando aqui dentro (mesmo motivo do
// projeto irmão Dias Transporte).
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
