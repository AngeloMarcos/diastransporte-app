import { describe, expect, it } from "vitest";
import { contarStatus, podeConcluir, STATUS_ATIVOS, statusOpcoes } from "./status";

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

describe("podeConcluir", () => {
  it("só permite concluir uma corrida já confirmada pelo escritório", () => {
    expect(podeConcluir("confirmado")).toBe(true);
  });

  it("não permite concluir uma corrida ainda pendente, cancelada ou já concluída", () => {
    expect(podeConcluir("pendente")).toBe(false);
    expect(podeConcluir("cancelado")).toBe(false);
    expect(podeConcluir("concluido")).toBe(false);
  });
});

describe("STATUS_ATIVOS", () => {
  it("considera pendente e confirmado como corridas ainda em aberto", () => {
    expect(STATUS_ATIVOS.has("pendente")).toBe(true);
    expect(STATUS_ATIVOS.has("confirmado")).toBe(true);
  });

  it("trata concluído e cancelado como histórico", () => {
    expect(STATUS_ATIVOS.has("concluido")).toBe(false);
    expect(STATUS_ATIVOS.has("cancelado")).toBe(false);
  });
});
