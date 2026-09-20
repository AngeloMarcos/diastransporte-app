// Sitemap dinâmico: sempre reflete as rotas ativas de verdade (mesma fonte
// de dados que a home/listagem usam), em vez de um arquivo estático que
// fica desatualizado quando uma rota é criada/ocultada pelo admin.
import { createFileRoute } from "@tanstack/react-router";

import { listRotas } from "@/lib/rotas.functions";
import { lastmodIso, lastmodMaisRecente } from "@/lib/seo";

/** Data da última revisão do texto das páginas legais/institucionais — atualizar
 * junto com "Última atualização" da própria página quando o texto mudar. */
const TEXTO_LEGAL_REVISADO_EM = "2026-09-20";

function tagUrl(origem: string, caminho: string, prioridade: string, lastmod?: string) {
  return [
    "  <url>",
    `    <loc>${origem}${caminho}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <priority>${prioridade}</priority>`,
    "  </url>",
  ].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origem = new URL(request.url).origin;
        const rotas = await listRotas();
        // Home e listagem mudam quando qualquer trecho muda; sem data confiável
        // (rotas estáticas de fallback), o lastmod simplesmente não é emitido.
        const ultimaEdicao = lastmodMaisRecente(rotas.map((r) => r.atualizadoEm));

        const paginas = [
          tagUrl(origem, "/", "1.0", ultimaEdicao),
          tagUrl(origem, "/transfers", "0.9", ultimaEdicao),
          tagUrl(origem, "/frota", "0.6"),
          tagUrl(origem, "/contato", "0.6"),
          tagUrl(origem, "/sobre", "0.5", TEXTO_LEGAL_REVISADO_EM),
          tagUrl(origem, "/cancelamento", "0.4", TEXTO_LEGAL_REVISADO_EM),
          tagUrl(origem, "/termos", "0.3", TEXTO_LEGAL_REVISADO_EM),
          tagUrl(origem, "/privacidade", "0.3", TEXTO_LEGAL_REVISADO_EM),
          ...rotas.map((r) =>
            tagUrl(origem, `/transfers/${r.slug}`, "0.8", lastmodIso(r.atualizadoEm)),
          ),
        ];

        const corpo = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...paginas,
          "</urlset>",
          "",
        ].join("\n");

        return new Response(corpo, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
