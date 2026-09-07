import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { MODO_VPS } from "@/lib/vps/config";

export type ConteudoRow = {
  id: string;
  chave: string;
  secao: string;
  titulo: string;
  texto: string;
  imagem: string;
  ordem: number;
};

export const CONTEUDO_COLUMNS = "id, chave, secao, titulo, texto, imagem, ordem";

export const listConteudo = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConteudoRow[]> => {
    // Mesmo bug de rotas.functions.ts::listRotas — sem este branch, texto e
    // imagem editados no admin da VPS nunca apareciam no site público
    // (sempre caía no texto padrão hardcoded de cada página).
    if (MODO_VPS) {
      const { vpsListConteudoPublico } = await import("@/lib/vps/dados.functions");
      return vpsListConteudoPublico();
    }

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return [];

    const supabase = createClient(url, key, {
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

    const { data, error } = await supabase
      .from("conteudo_site")
      .select(CONTEUDO_COLUMNS)
      .order("ordem", { ascending: true });

    if (error || !data) return [];
    return data as unknown as ConteudoRow[];
  },
);
