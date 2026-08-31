import { describe, expect, it } from "vitest";
import { contarStatus, statusOpcoes } from "./status";

describe("contarStatus", () => {
  it("conta cada status separadamente", () => {
    const contagem = contarStatus([
      { status: "pendente" },
      { status: "pendente" },
      { status: "confirmado" },
      { status: "cancelado" },
    ]);
    expect(contagem["pendente"]).toBe(2);
    expect(contagem["confirmado"]).toBe(1);
    expect(contagem["concluido"]).toBe(0);
    expect(contagem["cancelado"]).toBe(1);
  });

  it("devolve zero pra lista vazia, sem faltar nenhum status conhecido", () => {
    const contagem = contarStatus([]);
    for (const s of statusOpcoes) {
      expect(contagem[s]).toBe(0);
    }
  });
});
