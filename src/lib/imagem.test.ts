import { describe, expect, it } from "vitest";

import { dimensoesAlvo, nomeWebp, tipoOtimizavel } from "./imagem";

describe("dimensoesAlvo", () => {
  it("reduz pelo maior lado mantendo a proporção", () => {
    expect(dimensoesAlvo(4000, 3000)).toEqual({ largura: 1920, altura: 1440 });
    expect(dimensoesAlvo(3000, 4000)).toEqual({ largura: 1440, altura: 1920 });
  });
  it("não amplia foto pequena", () => {
    expect(dimensoesAlvo(800, 600)).toEqual({ largura: 800, altura: 600 });
    expect(dimensoesAlvo(1920, 1080)).toEqual({ largura: 1920, altura: 1080 });
  });
  it("nunca devolve lado zero em imagem muito alongada", () => {
    const r = dimensoesAlvo(20000, 3);
    expect(r.largura).toBe(1920);
    expect(r.altura).toBeGreaterThanOrEqual(1);
  });
});

describe("tipoOtimizavel", () => {
  it("regrava jpeg/png/webp e deixa vetor, animação e avif", () => {
    expect(tipoOtimizavel("image/jpeg")).toBe(true);
    expect(tipoOtimizavel("IMAGE/PNG")).toBe(true);
    expect(tipoOtimizavel("image/webp")).toBe(true);
    expect(tipoOtimizavel("image/svg+xml")).toBe(false);
    expect(tipoOtimizavel("image/gif")).toBe(false);
    expect(tipoOtimizavel("image/avif")).toBe(false);
  });
});

describe("nomeWebp", () => {
  it("troca a extensão e limpa caracteres problemáticos", () => {
    expect(nomeWebp("minha foto (1).JPG")).toBe("minha_foto_1.webp");
    expect(nomeWebp("Praia São Luís.png")).toBe("Praia_S_o_Lu_s.webp");
  });
  it("cai em 'foto' quando não sobra nada aproveitável", () => {
    expect(nomeWebp("###.jpg")).toBe("foto.webp");
  });
});
