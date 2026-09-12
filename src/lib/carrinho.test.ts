import { beforeEach, describe, expect, it } from "vitest";
import {
  adicionarAoCarrinho,
  lerCarrinho,
  limparCarrinho,
  removerDoCarrinho,
  temItemSemPreco,
  totalCarrinho,
  type ItemCarrinho,
} from "./carrinho";

const itemBase: Omit<ItemCarrinho, "id"> = {
  slug: "sao-luis-barreirinhas",
  rotaId: "11111111-1111-1111-1111-111111111111",
  trecho: "São Luís → Barreirinhas",
  origem: "São Luís",
  destino: "Barreirinhas",
  data: "2026-09-10",
  hora: "08:00",
  periodo: "dia",
  carro: "pequeno",
  passageiros: 2,
  embarqueLocal: "Aeroporto",
  observacoes: "",
  valor: 650,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("carrinho", () => {
  it("começa vazio", () => {
    expect(lerCarrinho()).toEqual([]);
  });

  it("adiciona um item e o devolve com um id gerado", () => {
    const criado = adicionarAoCarrinho(itemBase);
    expect(criado.id).toBeTruthy();
    expect(lerCarrinho()).toHaveLength(1);
    expect(lerCarrinho()[0]?.trecho).toBe("São Luís → Barreirinhas");
  });

  it("remove só o item indicado", () => {
    const primeiro = adicionarAoCarrinho(itemBase);
    adicionarAoCarrinho({ ...itemBase, destino: "Santo Amaro" });
    removerDoCarrinho(primeiro.id);
    const restantes = lerCarrinho();
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.destino).toBe("Santo Amaro");
  });

  it("limpa o carrinho inteiro", () => {
    adicionarAoCarrinho(itemBase);
    adicionarAoCarrinho(itemBase);
    limparCarrinho();
    expect(lerCarrinho()).toEqual([]);
  });

  it("ignora itens antigos sem rotaId (formato anterior ao preço server-side)", () => {
    window.localStorage.setItem(
      "dias-transporte:carrinho",
      JSON.stringify([
        { id: "x", trecho: "Sem rota" },
        { ...itemBase, id: "y" },
      ]),
    );
    const itens = lerCarrinho();
    expect(itens).toHaveLength(1);
    expect(itens[0]?.id).toBe("y");
  });
});

describe("totalCarrinho", () => {
  it("soma o valor dos itens", () => {
    expect(
      totalCarrinho([
        { ...itemBase, id: "1" },
        { ...itemBase, id: "2", valor: 700 },
      ]),
    ).toBe(1350);
  });

  it("trata item sem valor (sob consulta) como zero", () => {
    expect(totalCarrinho([{ ...itemBase, id: "1", valor: null }])).toBe(0);
  });

  it("soma zero pro carrinho vazio", () => {
    expect(totalCarrinho([])).toBe(0);
  });
});

describe("temItemSemPreco", () => {
  it("false quando todo item tem valor conhecido", () => {
    expect(
      temItemSemPreco([
        { ...itemBase, id: "1" },
        { ...itemBase, id: "2", valor: 700 },
      ]),
    ).toBe(false);
  });

  it("true quando pelo menos um item é sob consulta — mesmo com outros tendo preço", () => {
    // Cenário real do achado: carrinho com um item precificado e outro
    // "sob consulta" (ex.: carro grande numa rota sem esse preço) não pode
    // deixar o total parecer completo.
    expect(
      temItemSemPreco([
        { ...itemBase, id: "1" },
        { ...itemBase, id: "2", valor: null },
      ]),
    ).toBe(true);
  });

  it("false pro carrinho vazio", () => {
    expect(temItemSemPreco([])).toBe(false);
  });
});
