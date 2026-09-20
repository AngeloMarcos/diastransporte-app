// Verificação de saúde: o app está de pé E o banco responde. Serve ao
// healthcheck do Docker (que reinicia o container se falhar) e a monitores
// externos de disponibilidade. Resposta mínima de propósito — nada de versão,
// caminhos ou detalhes do erro pra quem consulta de fora.
import { createFileRoute } from "@tanstack/react-router";

const TEMPO_LIMITE_MS = 3000;

async function bancoResponde(): Promise<boolean> {
  try {
    const { sql } = await import("@/lib/vps/db.server");
    const consulta = sql()`SELECT 1`.then(() => true);
    const limite = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), TEMPO_LIMITE_MS),
    );
    return await Promise.race([consulta, limite]);
  } catch (erro) {
    console.error(
      JSON.stringify({
        tipo: "healthz_banco_falhou",
        erro: erro instanceof Error ? erro.message : String(erro),
      }),
    );
    return false;
  }
}

export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async () => {
        const ok = await bancoResponde();
        return new Response(JSON.stringify({ ok }), {
          status: ok ? 200 : 503,
          headers: {
            "content-type": "application/json",
            // Nunca cacheado: um monitor precisa ver o estado de agora.
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
