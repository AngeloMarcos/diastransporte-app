// robots.txt dinâmico: o "Sitemap:" tem que apontar pro domínio de quem
// pediu, não pra um endereço fixo. O arquivo estático (public/robots.txt)
// apontava pra wander-book-craft.lovable.app — o site ANTIGO — então todo
// buscador que lesse o robots do staging/produção da VPS era mandado pro
// sitemap do outro site (achado da auditoria do site). Mesma técnica de
// sitemap.xml.ts (origem da própria requisição), sem variável de ambiente.
import { createFileRoute } from "@tanstack/react-router";

import { origemDaRequisicao } from "@/lib/seguranca";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origem = origemDaRequisicao(request.url, request.headers);
        const corpo = [
          "User-agent: *",
          "Allow: /",
          // Áreas privadas/sem valor pra busca — já têm noindex, isto só
          // poupa o rastreamento.
          "Disallow: /admin",
          "Disallow: /api/",
          "Disallow: /healthz",
          "Disallow: /carrinho",
          "Disallow: /minhas-viagens",
          "Disallow: /auth",
          "Disallow: /login",
          "Disallow: /convite/",
          "Disallow: /motorista",
          "",
          `Sitemap: ${origem}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(corpo, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
