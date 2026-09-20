// Leitura pública da frota (carros + galeria "na estrada") — mesmo padrão
// de rotas.functions.ts: createServerFn com cliente Supabase avulso (sem o
// genérico <Database>, então não trava no typecheck mesmo antes de
// supabase/migrations/20260907010000_frota.sql ser aplicada e o Lovable
// regenerar types.ts), com fallback pro conteúdo estático em
// src/data/rotas.ts quando a tabela ainda não existe/está vazia/dá erro.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import {
  galeriaFrota as galeriaEstatica,
  veiculos as veiculosEstaticos,
  type FotoGaleria,
  type Veiculo,
} from "@/data/rotas";
import { MODO_VPS } from "@/lib/vps/config";

function clienteAvulso(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const listFrotaVeiculos = createServerFn({ method: "GET" }).handler(
  async (): Promise<Veiculo[]> => {
    if (MODO_VPS) {
      // Auditoria do site: "linhas.length ? banco : estático" escondia o banco
      // vazio. Fallback estático só se a LEITURA falhar (a frota real vem da
      // migration 0015).
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
    }

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return veiculosEstaticos;

    const { data, error } = await clienteAvulso(url, key)
      .from("frota_veiculos")
      .select("nome,modelo,passageiros,bagagem,foto,itens")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error || !data?.length) return veiculosEstaticos;
    return data as unknown as Veiculo[];
  },
);

export const listFrotaGaleria = createServerFn({ method: "GET" }).handler(
  async (): Promise<FotoGaleria[]> => {
    if (MODO_VPS) {
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
    }

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return galeriaEstatica;

    const { data, error } = await clienteAvulso(url, key)
      .from("frota_galeria")
      .select("foto,alt")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error || !data?.length) return galeriaEstatica;
    return data as unknown as FotoGaleria[];
  },
);
