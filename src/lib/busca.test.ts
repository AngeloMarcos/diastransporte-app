import { describe, expect, it } from "vitest";
import { buscaCombina, normalizarTexto } from "./busca";

describe("normalizarTexto", () => {
  it("tira acento, maiúscula e espaço sobrando", () => {
    expect(normalizarTexto("  São   LUÍS ")).toBe("sao luis");
    expect(normalizarTexto("Parnaíba")).toBe("parnaiba");
  });
});

describe("buscaCombina", () => {
  const campos = ["São Luís", "Barreirinhas", "Aeroporto Marechal Cunha Machado"];
  it("'sao luis' acha 'São Luís' (o caso que retornava 0)", () => {
    expect(buscaCombina("sao luis", campos)).toBe(true);
  });
  it("acha por local de embarque ('aeroporto')", () => {
    expect(buscaCombina("aeroporto", campos)).toBe(true);
  });
  it("todas as palavras precisam casar, em qualquer campo", () => {
    expect(buscaCombina("sao luis barreirinhas", campos)).toBe(true);
    expect(buscaCombina("sao luis jericoacoara", campos)).toBe(false);
  });
  it("termo vazio casa tudo", () => {
    expect(buscaCombina("   ", campos)).toBe(true);
  });
  it("ignora campos nulos", () => {
    expect(buscaCombina("barreirinhas", [null, undefined, "Barreirinhas"])).toBe(true);
  });
});
