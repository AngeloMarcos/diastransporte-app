// Achado revisando SEO: og:image/twitter:image precisam de URL ABSOLUTA
// (WhatsApp, Facebook etc. buscam a página de um servidor deles, não do
// navegador de quem compartilha — uma URL relativa não resolve pra nada).
// O site ainda não tem domínio final definido (roda em IP:porta até a
// Etapa 8 do roteiro da fusão), então em vez de fixar uma URL, pega a
// origem de quem fez a requisição de verdade — mesmo padrão já usado em
// src/routes/sitemap[.]xml.ts (new URL(request.url).origin).
//
// createServerFn (não um módulo .server.ts solto): tentei isso primeiro e
// o build falhou — o plugin de proteção de import do TanStack Start
// rastreia até import() dinâmico e barra qualquer caminho que leve
// "@tanstack/react-start/server" pro bundle do cliente. createServerFn é o
// jeito correto: o compilador troca o corpo do handler por uma chamada RPC
// no bundle do cliente, então dá pra importar isto normal, direto no topo
// do arquivo, em qualquer rota.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const origemAtual = createServerFn({ method: "GET" }).handler((): string => {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
});
