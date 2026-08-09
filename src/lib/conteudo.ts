import type { ConteudoRow } from "@/lib/conteudo.functions";

export type ConteudoMapa = Record<string, ConteudoRow | undefined>;

export function mapearConteudo(lista: ConteudoRow[] | undefined | null): ConteudoMapa {
  const mapa: ConteudoMapa = {};
  for (const item of lista ?? []) mapa[item.chave] = item;
  return mapa;
}

/** Texto do banco quando existir, senão o texto padrão do site. */
export function texto(
  mapa: ConteudoMapa,
  chave: string,
  campo: "titulo" | "texto" | "imagem",
  padrao: string,
): string {
  const valor = mapa[chave]?.[campo];
  return valor && valor.trim() ? valor : padrao;
}
