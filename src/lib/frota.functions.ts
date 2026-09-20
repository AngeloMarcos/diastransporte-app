// Leitura pública da frota (carros + galeria "na estrada"): vem do Postgres; se a
// LEITURA falhar (banco fora do ar), cai no conteúdo estático de src/data/rotas.ts
// para o site não ficar sem foto. Com o banco respondendo, o que está lá é a
// verdade — inclusive "nenhum veículo ativo" (a frota real vem da migration 0015).
import { createServerFn } from "@tanstack/react-start";

import {
  galeriaFrota as galeriaEstatica,
  veiculos as veiculosEstaticos,
  type FotoGaleria,
  type Veiculo,
} from "@/data/rotas";

export const listFrotaVeiculos = createServerFn({ method: "GET" }).handler(
  async (): Promise<Veiculo[]> => {
    try {
      const { vpsListFrotaVeiculosPublicos } = await import("@/lib/vps/dados.functions");
      return await vpsListFrotaVeiculosPublicos();
    } catch (erro) {
      console.error(
        JSON.stringify({
          tipo: "listFrotaVeiculos_fallback_estatico",
          erro: erro instanceof Error ? erro.message : String(erro),
        }),
      );
      return veiculosEstaticos;
    }
  },
);

export const listFrotaGaleria = createServerFn({ method: "GET" }).handler(
  async (): Promise<FotoGaleria[]> => {
    try {
      const { vpsListFrotaGaleriaPublica } = await import("@/lib/vps/dados.functions");
      return await vpsListFrotaGaleriaPublica();
    } catch (erro) {
      console.error(
        JSON.stringify({
          tipo: "listFrotaGaleria_fallback_estatico",
          erro: erro instanceof Error ? erro.message : String(erro),
        }),
      );
      return galeriaEstatica;
    }
  },
);
