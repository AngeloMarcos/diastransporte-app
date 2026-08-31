import { describe, expect, it } from "vitest";
import { senhaForte, SENHA_MIN } from "./senha";

describe("senhaForte", () => {
  it("aceita senha com letras e números no tamanho mínimo", () => {
    expect(senhaForte("abcd1234")).toBe(true);
  });

  it("rejeita senha curta demais mesmo com letra e número", () => {
    expect(senhaForte("ab1")).toBe(false);
  });

  it("rejeita senha só com letras", () => {
    expect(senhaForte("abcdefgh")).toBe(false);
  });

  it("rejeita senha só com números", () => {
    expect(senhaForte("12345678")).toBe(false);
  });

  it(`aceita exatamente ${SENHA_MIN} caracteres`, () => {
    const senha = `${"a".repeat(SENHA_MIN - 1)}1`;
    expect(senha).toHaveLength(SENHA_MIN);
    expect(senhaForte(senha)).toBe(true);
  });

  it(`rejeita ${SENHA_MIN - 1} caracteres`, () => {
    const senha = `${"a".repeat(SENHA_MIN - 2)}1`;
    expect(senha).toHaveLength(SENHA_MIN - 1);
    expect(senhaForte(senha)).toBe(false);
  });
});
