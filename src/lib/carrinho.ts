// Carrinho de reservas — guardado no localStorage do navegador.
// Não recalcula preço: o valor vem já calculado pela página da rota
// (precoFinal), este módulo só transporta e persiste.

import { useCallback, useEffect, useState } from "react";

export type ItemCarrinho = {
  id: string;
  slug: string;
  rotaId?: string | null;
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
    return Array.isArray(dados) ? dados : [];
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

  return { itens, pronto, total: totalCarrinho(itens), remover: removerDoCarrinho, limpar: limparCarrinho };
}
