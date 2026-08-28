// Sitemap dinâmico: sempre reflete as rotas ativas de verdade (mesma fonte
// de dados que a home/listagem usam), em vez de um arquivo estático que
// fica desatualizado quando uma rota é criada/ocultada pelo admin.
import { createFileRoute } from "@tanstack/react-router";

import { listRotas } from "@/lib/rotas.functions";

function tagUrl(origem: string, caminho: string, prioridade: string) {
  return `  <url>\n    <loc>${origem}${caminho}</loc>\n    <priority>${prioridade}</priority>\n  </url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origem = new URL(request.url).origin;
        const rotas = await listRotas();

        const paginas = [
          tagUrl(origem, "/", "1.0"),
          tagUrl(origem, "/transfers", "0.9"),
          tagUrl(origem, "/frota", "0.6"),
          tagUrl(origem, "/contato", "0.6"),
          ...rotas.map((r) => tagUrl(origem, `/transfers/${r.slug}`, "0.8")),
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
