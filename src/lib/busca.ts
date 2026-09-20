// Busca tolerante de texto — lógica pura.
//
// Achado da auditoria do site: digitar "sao luis" retornava 0 trechos (só
// "são luís" funcionava) e "aeroporto" também 0, embora as rotas de São
// Luís saiam do aeroporto: o filtro comparava só origem+destino com
// toLowerCase().includes(), sem tirar acento e sem olhar embarque/descrição.

/** minúsculas, sem acento, espaços colapsados: "São  Luís" → "sao luis". */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Todas as palavras do termo precisam aparecer em algum dos campos
 * (E, não OU): "sao luis barreirinhas" acha a rota São Luís → Barreirinhas
 * mesmo com origem e destino em campos separados. Termo vazio casa tudo. */
export function buscaCombina(
  termo: string,
  campos: readonly (string | null | undefined)[],
): boolean {
  const palavras = normalizarTexto(termo).split(" ").filter(Boolean);
  if (!palavras.length) return true;
  const alvo = normalizarTexto(campos.filter(Boolean).join(" "));
  return palavras.every((p) => alvo.includes(p));
}
