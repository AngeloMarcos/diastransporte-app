import { describe, expect, it } from "vitest";
import {
  faltandoParaPublicarRota,
  faltandoParaPublicarVeiculo,
  textoMalas,
  textoPassageiros,
  tiposDeVeiculo,
} from "./publicacao";

const veiculoOk = {
  modelo: "Fiat Cronos",
  foto: "/frota/frota-1.jpeg",
  categoria: "pequeno",
  capacidade_passageiros: 4,
  malas: 3,
};

describe("faltandoParaPublicarVeiculo", () => {
  it("veículo completo não falta nada", () => {
    expect(faltandoParaPublicarVeiculo(veiculoOk)).toEqual([]);
  });
  it("sem foto é o quadrado preto — a primeira coisa apontada", () => {
    expect(faltandoParaPublicarVeiculo({ ...veiculoOk, foto: "  " })).toEqual(["foto"]);
  });
  it("lista tudo que falta, em ordem", () => {
    const f = faltandoParaPublicarVeiculo({
      modelo: "",
      foto: "",
      categoria: null,
      capacidade_passageiros: null,
      malas: null,
    });
    expect(f).toHaveLength(5);
    expect(f[0]).toBe("foto");
  });
  it("zero malas é um valor válido (não conta como faltando)", () => {
    expect(faltandoParaPublicarVeiculo({ ...veiculoOk, malas: 0 })).toEqual([]);
  });
});

describe("faltandoParaPublicarRota", () => {
  it("rota completa passa", () => {
    expect(faltandoParaPublicarRota({ foto: "/a.jpg", resumo: "x", preco_pequeno: 650 })).toEqual(
      [],
    );
  });
  it("sem foto, sem resumo e preço zero", () => {
    expect(faltandoParaPublicarRota({ foto: "", resumo: "", preco_pequeno: 0 })).toEqual([
      "foto principal",
      "resumo",
      "preço do carro pequeno",
    ]);
  });
});

describe("textos compostos", () => {
  it("passageiros no mesmo formato de antes", () => {
    expect(textoPassageiros(4)).toBe("Até 4 passageiros");
    expect(textoPassageiros(1)).toBe("Até 1 passageiro");
  });
  it("malas", () => {
    expect(textoMalas(3)).toBe("3 malas médias");
    expect(textoMalas(1)).toBe("1 mala média");
    expect(textoMalas(0)).toBe("Sem bagagem grande");
  });
  it("tipos de veículo vem da frota real, não do texto fixo 'Dois'", () => {
    expect(tiposDeVeiculo(2)).toBe("Dois tipos de veículo");
    expect(tiposDeVeiculo(1)).toBe("Um tipo de veículo");
    expect(tiposDeVeiculo(3)).toBe("Três tipos de veículo");
    expect(tiposDeVeiculo(9)).toBe("9 tipos de veículo");
  });
});
