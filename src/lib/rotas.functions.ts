import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { rotas as rotasEstaticas, type Rota } from "@/data/rotas";
import { ROTA_COLUMNS, rowToRota, type RotaRow } from "@/lib/rotasMap";

export const listRotas = createServerFn({ method: "GET" }).handler(async (): Promise<Rota[]> => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return rotasEstaticas;

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
    .from("rotas")
    .select(ROTA_COLUMNS)
    .eq("ativo", true)
    .order("popularidade", { ascending: false });

  if (error || !data?.length) return rotasEstaticas;
  return (data as unknown as RotaRow[]).map(rowToRota);
});
