import { describe, expect, it } from "vitest";
import { formatBRL, precoFinal, type Rota } from "./rotas";

// Sem preco de noite por padrao - exactOptionalPropertyTypes nao deixa
// "desligar" um campo opcional atribuindo undefined, entao os testes que
// precisam do preco de noite usam rotaComNoite em vez de espalhar undefined
// por cima deste objeto.
const rotaBase: Rota = {
  slug: "teste",
  origem: "A",
  destino: "B",
  ida_e_volta: true,
  duracao: "1h",
  distancia: "10 km",
  precoPequeno: 500,
  precoGrande: 800,
  popularidade: 0,
  resumo: "",
  descricao: "",
  embarque: [],
  foto: "",
  galeria: [],
};

const rotaComNoite: Rota = {
  ...rotaBase,
  precoPequenoNoite: 550,
  precoGrandeNoite: 900,
};

const rotaSemCarroGrande: Rota = {
  ...rotaBase,
  precoGrande: null,
};

describe("precoFinal", () => {
  it("usa o preco de dia por padrao", () => {
    expect(precoFinal(rotaBase, "pequeno", "dia")).toBe(500);
    expect(precoFinal(rotaBase, "grande", "dia")).toBe(800);
  });

  it("usa o preco de noite quando existe", () => {
    expect(precoFinal(rotaComNoite, "pequeno", "noite")).toBe(550);
    expect(precoFinal(rotaComNoite, "grande", "noite")).toBe(900);
  });

  it("cai pro preco de dia quando nao ha preco de noite especifico", () => {
    expect(precoFinal(rotaBase, "pequeno", "noite")).toBe(500);
    expect(precoFinal(rotaBase, "grande", "noite")).toBe(800);
  });

  it("devolve null quando a rota nao tem carro grande", () => {
    expect(precoFinal(rotaSemCarroGrande, "grande", "dia")).toBeNull();
    expect(precoFinal(rotaSemCarroGrande, "grande", "noite")).toBeNull();
  });
});

// toLocaleString("pt-BR", { style: "currency" }) separa "R$" do valor com um
// espaco nao separavel (code point 160), nao um espaco comum digitado -
// String.fromCharCode evita depender de colar esse caractere no arquivo.
const ESPACO_MOEDA = String.fromCharCode(160);

describe("formatBRL", () => {
  it("formata em reais sem casas decimais", () => {
    expect(formatBRL(650)).toBe(`R$${ESPACO_MOEDA}650`);
  });

  it("formata zero", () => {
    expect(formatBRL(0)).toBe(`R$${ESPACO_MOEDA}0`);
  });
});
