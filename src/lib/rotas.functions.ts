import { createServerFn } from "@tanstack/react-start";

import { rotas as rotasEstaticas, type Rota } from "@/data/rotas";
import { rowToRota } from "@/lib/rotasMap";

/** Rotas ativas do site público, ordenadas por popularidade. */
export const listRotas = createServerFn({ method: "GET" }).handler(async (): Promise<Rota[]> => {
  // Auditoria do site: "linhas.length ? banco : estático" escondia o banco
  // vazio — o site mostrava 9 rotas e o admin 0, e a reserva falhava com
  // "rota indisponível" (as rotas estáticas não têm id). O fallback estático
  // só entra quando a LEITURA falha (banco fora do ar); com o banco
  // respondendo, o que está lá é a verdade — inclusive "nenhuma rota ativa".
  // As rotas iniciais vêm da migration 0013.
  try {
    const { vpsListRotasPublicas } = await import("@/lib/vps/dados.functions");
    const linhas = await vpsListRotasPublicas();
    return linhas.map(rowToRota);
  } catch (erro) {
    console.error(
      JSON.stringify({
        tipo: "listRotas_fallback_estatico",
        erro: erro instanceof Error ? erro.message : String(erro),
      }),
    );
    return rotasEstaticas;
  }
});
