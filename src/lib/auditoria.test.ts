import { describe, expect, it } from "vitest";
import { diferencaCampos, semMudancas } from "./auditoria";

describe("diferencaCampos", () => {
  it("devolve só os campos que mudaram", () => {
    const d = diferencaCampos(
      { preco_pequeno: 650, origem: "A", ativo: true },
      { preco_pequeno: 700, origem: "A", ativo: true },
      ["preco_pequeno", "origem", "ativo"],
    );
    expect(d).toEqual({ antes: { preco_pequeno: 650 }, depois: { preco_pequeno: 700 } });
  });

  it("detecta mudança em array (galeria de fotos)", () => {
    const d = diferencaCampos({ galeria: ["a", "b"] }, { galeria: ["a"] }, ["galeria"]);
    expect(d.antes["galeria"]).toEqual(["a", "b"]);
    expect(d.depois["galeria"]).toEqual(["a"]);
  });

  it("trata null e ausente como o mesmo valor", () => {
    const d = diferencaCampos({ destaque: null }, {}, ["destaque"]);
    expect(semMudancas(d)).toBe(true);
  });

  it("ignora campos fora da lista", () => {
    const d = diferencaCampos({ a: 1, b: 1 }, { a: 2, b: 2 }, ["a"]);
    expect(Object.keys(d.antes)).toEqual(["a"]);
  });

  it("corta textos longos em vez de copiar o banco inteiro", () => {
    const longo = "x".repeat(1000);
    const d = diferencaCampos({ descricao: "curto" }, { descricao: longo }, ["descricao"]);
    const gravado = d.depois["descricao"] as string;
    expect(gravado.length).toBeLessThan(400);
    expect(gravado).toContain("+700 caracteres");
  });

  it("sem mudança nenhuma → semMudancas", () => {
    expect(semMudancas(diferencaCampos({ a: 1 }, { a: 1 }, ["a"]))).toBe(true);
  });
});
