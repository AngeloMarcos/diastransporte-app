// Carrinho de reservas — guardado no localStorage do navegador.
// Não recalcula preço: o valor vem já calculado pela página da rota
// (precoFinal), este módulo só transporta e persiste.

import { useCallback, useEffect, useState } from "react";

export type ItemCarrinho = {
  id: string;
  slug: string;
  /** Obrigatório: o banco calcula o preço oficial a partir da rota. */
  rotaId: string;
  trecho: string;
  origem: string;
  destino: string;
  data: string;
  hora: string;
  periodo: "dia" | "noite";
  carro: "pequeno" | "grande";
  passageiros: number;
  embarqueLocal: string;
  observacoes: string;
  valor: number | null;
};

const CHAVE = "dias-transporte:carrinho";
const EVENTO = "dias-transporte:carrinho-mudou";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function lerCarrinho(): ItemCarrinho[] {
  try {
    const bruto = storage()?.getItem(CHAVE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto) as ItemCarrinho[];
    if (!Array.isArray(dados)) return [];
    // Itens antigos sem rotaId não podem ser reservados (o banco exige a rota).
    return dados.filter((i) => typeof i?.rotaId === "string" && i.rotaId.length > 0);
  } catch {
    return [];
  }
}

function gravar(itens: ItemCarrinho[]) {
  storage()?.setItem(CHAVE, JSON.stringify(itens));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function adicionarAoCarrinho(item: Omit<ItemCarrinho, "id">): ItemCarrinho {
  const novo: ItemCarrinho = {
    ...item,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
  gravar([...lerCarrinho(), novo]);
  return novo;
}

export function removerDoCarrinho(id: string) {
  gravar(lerCarrinho().filter((i) => i.id !== id));
}

export function limparCarrinho() {
  gravar([]);
}

export function totalCarrinho(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + (i.valor ?? 0), 0);
}

/** Achado revisando UX: totalCarrinho soma só os itens com valor conhecido,
 * então um carrinho com 1 item de R$650 e outro "sob consulta" (valor null,
 * ex.: carro grande numa rota sem esse preço) mostrava um total de R$650
 * como se fosse o valor completo, sem indicar que falta cobrar +1 item —
 * carrinho.tsx usa isto pra avisar quando o total exibido está incompleto. */
export function temItemSemPreco(itens: ItemCarrinho[]): boolean {
  return itens.some((i) => i.valor === null);
}

/** Estado reativo do carrinho no cliente (SSR-safe: começa vazio). */
export function useCarrinho() {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [pronto, setPronto] = useState(false);

  const sincronizar = useCallback(() => setItens(lerCarrinho()), []);

  useEffect(() => {
    sincronizar();
    setPronto(true);
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, [sincronizar]);

  return {
    itens,
    pronto,
    total: totalCarrinho(itens),
    remover: removerDoCarrinho,
    limpar: limparCarrinho,
  };
}
