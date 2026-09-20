// SEO — lógica pura (client-safe): URL canônica, dados estruturados (JSON-LD) e
// datas do sitemap. Vive fora das rotas pra ter teste e uma fonte só.
import { EMPRESA, type Rota } from "@/data/rotas";

/** Páginas que não devem ser indexadas (privadas ou sem valor pra busca) — mesma
 * lista do Disallow do robots.txt. Não emitem canonical. */
const PREFIXOS_PRIVADOS = [
  "/admin",
  "/api",
  "/carrinho",
  "/minhas-viagens",
  "/auth",
  "/login",
  "/convite",
  "/motorista",
  "/healthz",
];

export function ehCaminhoPrivado(caminho: string): boolean {
  return PREFIXOS_PRIVADOS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/** URL canônica: origem + caminho, sem query string, hash nem barra final
 * (exceto a raiz). null quando não há origem ou a página é privada. */
export function urlCanonica(origem: string, caminho: string): string | null {
  if (!origem || ehCaminhoPrivado(caminho)) return null;
  const limpo = caminho.split(/[?#]/)[0] ?? "/";
  const semBarra = limpo.length > 1 ? limpo.replace(/\/+$/, "") : limpo;
  return `${origem.replace(/\/+$/, "")}${semBarra || "/"}`;
}

/** Só a data (AAAA-MM-DD), como o sitemap pede em <lastmod>. undefined se a
 * entrada não for uma data válida (o campo é opcional no sitemap). */
export function lastmodIso(valor: string | Date | null | undefined): string | undefined {
  if (!valor) return undefined;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** A data mais recente de uma lista (ou undefined se nenhuma for válida). */
export function lastmodMaisRecente(
  valores: (string | Date | null | undefined)[],
): string | undefined {
  const datas = valores.map(lastmodIso).filter((v): v is string => Boolean(v));
  return datas.sort().at(-1);
}

/** JSON-LD da empresa (home). Só declara o que o site realmente publica —
 * nome, telefone, cidade-base, região atendida e horário; sem inventar
 * endereço, CNPJ ou avaliações. */
export function dadosEstruturadosEmpresa(origem: string, imagem?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    name: EMPRESA.nome,
    slogan: EMPRESA.assinatura,
    url: origem,
    telephone: `+${EMPRESA.whatsapp}`,
    ...(imagem ? { image: imagem } : {}),
    areaServed: [
      "São Luís",
      "Barreirinhas",
      "Santo Amaro do Maranhão",
      "Parnaíba",
      "Barra Grande",
      "Jericoacoara",
    ].map((nome) => ({ "@type": "City", name: nome })),
    address: {
      "@type": "PostalAddress",
      addressLocality: "São Luís",
      addressRegion: "MA",
      addressCountry: "BR",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: EMPRESA.abre,
      closes: EMPRESA.fecha,
    },
  };
}

/** JSON-LD de um transfer: o serviço e o preço "a partir de" (por veículo). */
export function dadosEstruturadosServico(
  origem: string,
  rota: Pick<Rota, "slug" | "origem" | "destino" | "resumo" | "precoPequeno">,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Transfer ${rota.origem} → ${rota.destino}`,
    description: rota.resumo,
    serviceType: "Transfer particular",
    url: `${origem}/transfers/${rota.slug}`,
    provider: { "@type": "TaxiService", name: EMPRESA.nome, telephone: `+${EMPRESA.whatsapp}` },
    areaServed: [rota.origem, rota.destino].map((nome) => ({ "@type": "City", name: nome })),
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: rota.precoPequeno,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "BRL",
        price: rota.precoPequeno,
        unitText: "por veículo",
      },
      availability: "https://schema.org/InStock",
    },
  };
}
